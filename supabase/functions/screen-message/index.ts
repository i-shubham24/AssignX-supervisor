import { preflightResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAuthenticatedUser } from "../_shared/admin.ts";

export interface ScreenResult {
  state: "delivered" | "held";
  held_reason: "contact_details" | "identity_reveal" | null;
  screen_note: string | null;
}

const FAIL_CLOSED: ScreenResult = {
  state: "held",
  held_reason: "contact_details",
  screen_note: "Held automatically by fail-closed screening safeguard (BR-015).",
};

async function runLlmScreening(body: string, roleLabel: string): Promise<ScreenResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return FAIL_CLOSED;

  const model = Deno.env.get("ANTHROPIC_SCREEN_MODEL") || "claude-haiku-4-5-20251001";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(800),
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 120,
        system:
          'Respond strictly as compact JSON: {"action":"allow"|"hold","reason":"contact_details"|"identity_reveal"|null,"note":"short reason"}. Hold if the message shares personal email, phone number (even spelled out), messaging handles, off-platform links, payment details, real name, university, or employer.',
        messages: [{ role: "user", content: `Sender role: ${roleLabel}\nMessage: ${body}` }],
      }),
    });
    if (!res.ok) return FAIL_CLOSED;
    const payload = (await res.json()) as { content?: { type?: string; text?: string }[] };
    const text = payload.content?.[0]?.text ?? "";
    const parsed = JSON.parse(text) as { action?: string; reason?: string | null; note?: string | null };
    if (parsed.action === "allow") return { state: "delivered", held_reason: null, screen_note: null };
    if (parsed.action === "hold") {
      const reason = parsed.reason === "identity_reveal" ? "identity_reveal" : "contact_details";
      return {
        state: "held",
        held_reason: reason,
        screen_note: typeof parsed.note === "string" && parsed.note.trim() ? parsed.note.trim().slice(0, 240) : "Held for manual moderation review.",
      };
    }
    return FAIL_CLOSED;
  } catch {
    return FAIL_CLOSED;
  }
}

/**
 * screen-message: Mandatory AI screening gateway for client and doer messages
 * (PRD 13.4, BR-014, BR-015). Direct client INSERT on public.messages is revoked
 * in migration 0171; all chat sends route here with fail-closed holding.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  if (req.method !== "POST") return jsonResponse({ error: "method not allowed" }, 405);

  const auth = await requireAuthenticatedUser(req);
  if (auth instanceof Response) return auth;

  let raw: { thread_id?: unknown; body?: unknown };
  try {
    raw = (await req.json()) as { thread_id?: unknown; body?: unknown };
  } catch {
    return jsonResponse({ error: "invalid JSON body" }, 400);
  }

  const threadId = typeof raw.thread_id === "string" ? raw.thread_id.trim() : "";
  const body = typeof raw.body === "string" ? raw.body.trim() : "";
  if (!threadId || !body || body.length > 4000) {
    return jsonResponse({ error: "thread_id and non-empty body (<= 4000 chars) are required" }, 400);
  }

  const { data: thread } = await auth.admin
    .from("threads")
    .select("id, project_id, kind")
    .eq("id", threadId)
    .maybeSingle();
  if (!thread) return jsonResponse({ error: "thread not found" }, 404);
  const th = thread as { id: string; project_id: string; kind: string };

  const { data: proj } = await auth.admin
    .from("projects")
    .select("id, user_id, supervisor_id, doer_id")
    .eq("id", th.project_id)
    .maybeSingle();
  if (!proj) return jsonResponse({ error: "project not found" }, 404);
  const p = proj as { id: string; user_id: string; supervisor_id: string | null; doer_id: string | null };

  const role = String(auth.claims.assignx_role ?? "user");
  const segment = String(auth.claims.segment ?? "");
  const isStaff = ["supervisor", "qqd", "support", "admin"].includes(role) || ["supervisor", "qqd", "support"].includes(segment);

  const allowed =
    isStaff ||
    (th.kind === "user_supervisor" && p.user_id === auth.user.id) ||
    (th.kind === "supervisor_doer" && p.doer_id === auth.user.id) ||
    th.kind === "invite";
  if (!allowed) return jsonResponse({ error: "forbidden for this thread" }, 403);

  const outcome: ScreenResult = isStaff
    ? { state: "delivered", held_reason: null, screen_note: null }
    : await runLlmScreening(body, role === "doer" ? "expert" : "client");

  const { data: inserted, error: insErr } = await auth.admin.rpc("submit_screened_message", {
    p_thread: th.id,
    p_author: auth.user.id,
    p_body: body,
    p_state: outcome.state,
    p_held_reason: outcome.held_reason,
    p_screen_note: outcome.screen_note,
  });

  if (insErr || !inserted) {
    return jsonResponse({ error: "could not persist message" }, 500);
  }

  // Broadcast cleanly so recipients see delivered messages immediately, while held messages notify staff only.
  const topic = outcome.state === "delivered" ? `thread:${th.id}` : "queue:moderation";
  const event = outcome.state === "delivered" ? "INSERT" : "held_message";
  await auth.admin.channel(topic).send({
    type: "broadcast",
    event,
    payload: outcome.state === "delivered" ? { thread_id: th.id } : { project_id: p.id, thread_id: th.id },
  });

  return jsonResponse({ message: inserted, screened_state: outcome.state }, 201);
});
