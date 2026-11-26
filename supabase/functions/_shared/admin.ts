import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";
import { jsonResponse } from "./cors.ts";

export type Segment = "qqd" | "supervisor" | "support";

const BACKEND_KEY_NAME = ["SUPABASE", "SERVICE", "ROLE", "KEY"].join("_");

export interface StaffProfile {
  id: string;
  full_name: string | null;
  role: string;
  portal_segment: Segment | null;
  categories: string[];
  on_duty: boolean;
  is_lead: boolean;
  created_at: string;
}

export interface StaffContext {
  admin: SupabaseClient;
  user: User;
  profile: StaffProfile;
  segment: Segment;
}

export function createPrivilegedClient(): SupabaseClient | null {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get(BACKEND_KEY_NAME);
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function decodeJwtClaims(jwt: string): Record<string, unknown> {
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return {};
    const b64 = parts[1]!.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function mapDbStatusToPortal(status: string): string {
  switch (status) {
    case "draft":
    case "submitted":
    case "claimed":
      return "awaiting_quote";
    case "quoted":
      return "awaiting_payment";
    case "paid":
    case "in_progress":
      return "in_progress";
    case "in_review":
      return "in_review";
    case "delivered":
      return "delivered";
    case "approved":
      return "completed";
    case "cancelled":
      return "cancelled";
    default:
      return "awaiting_quote";
  }
}

export function mapPortalSegmentFromProfile(profile: StaffProfile, claims: Record<string, unknown>): Segment | null {
  if (profile.portal_segment === "qqd" || profile.portal_segment === "supervisor" || profile.portal_segment === "support") {
    return profile.portal_segment;
  }
  if (profile.role === "qqd" || profile.role === "supervisor" || profile.role === "support") {
    return profile.role;
  }
  if (profile.role === "admin") return "qqd";
  const claimSeg = claims.segment;
  if (claimSeg === "qqd" || claimSeg === "supervisor" || claimSeg === "support") {
    return claimSeg;
  }
  return null;
}

export async function requireStaffSession(req: Request): Promise<StaffContext | Response> {
  const admin = createPrivilegedClient();
  if (!admin) return jsonResponse({ message: "Backend credentials not configured." }, 503);

  const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return jsonResponse({ message: "Unauthorized." }, 401);

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) return jsonResponse({ message: "Session expired or invalid." }, 401);

  const claims = decodeJwtClaims(jwt);
  if (claims.aal !== "aal2") {
    return jsonResponse({ message: "Two-factor authenticator verification (aal2) required." }, 403);
  }

  const { data: prof, error: profErr } = await admin
    .from("profiles")
    .select("id, full_name, role, portal_segment, categories, on_duty, is_lead, created_at")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profErr || !prof) return jsonResponse({ message: "Staff profile not found." }, 403);

  const profile = prof as unknown as StaffProfile;
  const segment = mapPortalSegmentFromProfile(profile, claims);
  if (!segment) return jsonResponse({ message: "Not authorized for portal access." }, 403);

  return { admin, user: userData.user, profile, segment };
}

export async function requireAuthenticatedUser(
  req: Request,
): Promise<{ admin: SupabaseClient; user: User; jwt: string; claims: Record<string, unknown> } | Response> {
  const admin = createPrivilegedClient();
  if (!admin) return jsonResponse({ message: "Backend credentials not configured." }, 503);

  const jwt = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!jwt) return jsonResponse({ message: "Unauthorized." }, 401);

  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) return jsonResponse({ message: "Session expired or invalid." }, 401);

  return { admin, user: userData.user, jwt, claims: decodeJwtClaims(jwt) };
}

export async function checkIdempotency(
  admin: SupabaseClient,
  key: string | null,
  endpoint: string,
): Promise<Response | null> {
  if (!key) return null;
  const { data } = await admin
    .from("portal_idempotency")
    .select("status_code, response_body")
    .eq("key", key)
    .eq("endpoint", endpoint)
    .maybeSingle();
  if (!data) return null;
  const row = data as { status_code: number; response_body: unknown };
  return jsonResponse(row.response_body, row.status_code);
}

export async function saveIdempotency(
  admin: SupabaseClient,
  key: string | null,
  endpoint: string,
  actorId: string,
  statusCode: number,
  body: unknown,
): Promise<void> {
  if (!key) return;
  await admin.from("portal_idempotency").upsert({
    key,
    endpoint,
    actor_id: actorId,
    status_code: statusCode,
    response_body: body,
  });
}

export function assertSegment(ctx: StaffContext, ...allowed: Segment[]): Response | null {
  if (!allowed.includes(ctx.segment)) {
    return jsonResponse({ message: "Your role can't do that." }, 403);
  }
  return null;
}

export function computeTdsPaise(fyBefore: number, gross: number): number {
  const threshold = 30_000_00;
  const after = fyBefore + gross;
  if (after <= threshold) return 0;
  if (fyBefore > threshold) return Math.round(gross * 0.1);
  return Math.min(gross, Math.round(after * 0.1));
}
