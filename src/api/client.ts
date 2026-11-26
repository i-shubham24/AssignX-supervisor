import { env } from "@/lib/env";
import { portalError } from "@/lib/user-error";
import { supabase } from "@/lib/supabase";

/**
 * The seam between screens and the backend.
 *
 * Every api function names the endpoint it stands for (PRD 18.5 paths) and passes a
 * demo implementation. In demo mode the demo store answers after a short, jittered
 * delay so loading states are real. With VITE_DEMO_MODE=false the call routes either
 * to VITE_API_BASE_URL or directly to the Supabase Edge Function `portal-api`.
 */

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface Endpoint {
  method: "GET" | "POST" | "PUT" | "PATCH";
  path: string;
}

export interface CallOptions {
  latency?: number;
  body?: unknown;
  headers?: Record<string, string>;
  idempotencyKey?: string;
}

export function resolvePortalUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (env.apiBaseUrl) return `${env.apiBaseUrl}${path}`;
  if (env.supabaseUrl && path.startsWith("/api/portal")) {
    return `${env.supabaseUrl}/functions/v1/portal-api${path}`;
  }
  return path;
}

export async function buildPortalHeaders(extra?: Record<string, string>, skipContentType = false): Promise<Record<string, string>> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...extra,
  };
  if (!skipContentType) {
    headers["Content-Type"] = "application/json";
  }
  if (env.supabasePublishableKey) {
    headers["apikey"] = env.supabasePublishableKey;
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export function newIdempotencyKey(prefix = "idem"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function call<T>(
  endpoint: Endpoint,
  demo: () => T,
  optionsOrLatency: number | CallOptions = 180,
): Promise<T> {
  const opts: CallOptions =
    typeof optionsOrLatency === "number" ? { latency: optionsOrLatency } : optionsOrLatency;
  const latency = opts.latency ?? 180;

  if (env.demoMode) {
    await sleep(latency + Math.round(Math.random() * 140));
    return demo();
  }

  try {
    const isForm = typeof FormData !== "undefined" && opts.body instanceof FormData;
    const headers = await buildPortalHeaders(opts.headers, isForm);
    if (opts.idempotencyKey) {
      headers["Idempotency-Key"] = opts.idempotencyKey;
    }

    const res = await fetch(resolvePortalUrl(endpoint.path), {
      method: endpoint.method,
      headers,
      body: isForm ? (opts.body as FormData) : opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });

    if (!res.ok) {
      const errJson = (await res.json().catch(() => null)) as { message?: string } | null;
      throw portalError(
        errJson?.message || `${endpoint.method} ${endpoint.path} failed with HTTP ${res.status}`,
      );
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof Error && err.name === "PortalError") throw err;
    throw portalError(
      `Failed to connect to ${endpoint.method} ${endpoint.path}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

export const GET = (path: string): Endpoint => ({ method: "GET", path });
export const POST = (path: string): Endpoint => ({ method: "POST", path });
export const PATCH = (path: string): Endpoint => ({ method: "PATCH", path });
