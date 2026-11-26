import { preflightResponse, jsonResponse } from "../_shared/cors.ts";
import { requireStaffSession } from "../_shared/admin.ts";
import { handleReadRoute } from "./routes-read.ts";
import { handleWriteRoute } from "./routes-write.ts";

/**
 * portal-api: Unified Supabase Edge Function serving /api/portal/* endpoints for
 * AssignX Supervisor (QQD, Supervisor, Support segments) with JWT + aal2 + segment +
 * BOLA ownership verification backed by PostgreSQL.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();

  const auth = await requireStaffSession(req);
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const idx = url.pathname.indexOf("/api/portal");
  const path = idx >= 0 ? url.pathname.slice(idx) : url.pathname;

  try {
    if (req.method === "GET") {
      const res = await handleReadRoute(auth, path, url);
      return res ?? jsonResponse({ message: `Unknown portal route: ${path}` }, 404);
    }

    if (req.method === "POST" || req.method === "PATCH") {
      const res = await handleWriteRoute(auth, req.method, path, req);
      return res ?? jsonResponse({ message: `Unsupported portal mutation: ${req.method} ${path}` }, 404);
    }

    return jsonResponse({ message: "Method not allowed." }, 405);
  } catch (err) {
    console.error("[portal-api] unhandled error:", err instanceof Error ? err.message : String(err));
    return jsonResponse({ message: "Internal portal error." }, 500);
  }
});
