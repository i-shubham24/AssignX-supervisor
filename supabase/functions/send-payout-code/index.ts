import { preflightResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAuthenticatedUser } from "../_shared/admin.ts";

/**
 * send-payout-code: Delivers a 6-digit verification code ONLY to the authenticated
 * user's verified sign-in email (never editable profiles.whatsapp, mitigating the
 * payout hijack vector noted in Dolancer BACKEND-HANDOFF §7.1).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  if (req.method !== "POST") return jsonResponse({ error: "method not allowed" }, 405);

  const auth = await requireAuthenticatedUser(req);
  if (auth instanceof Response) return auth;

  const verifiedEmail = auth.user.email;
  if (!verifiedEmail) {
    return jsonResponse({ error: "no verified sign-in email on account" }, 400);
  }

  // Require aal2 if the user has already enabled authenticator 2FA.
  const { data: factors } = await auth.admin.auth.admin.mfa.listFactors({ userId: auth.user.id });
  const hasVerifiedTotp = factors?.factors?.some((f) => f.status === "verified");
  if (hasVerifiedTotp && auth.claims.aal !== "aal2") {
    return jsonResponse({ error: "authenticator verification required before changing payout details" }, 403);
  }

  const digits = new Uint32Array(1);
  crypto.getRandomValues(digits);
  const code = String(100_000 + (digits[0]! % 900_000));

  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${auth.user.id}:${code}`));
  const codeHash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  await auth.admin.from("audit_log").insert({
    actor_id: auth.user.id,
    action: "payout_code_issued",
    entity_type: "profile",
    entity_id: auth.user.id,
    metadata: {
      code_hash: codeHash,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      channel: "verified_email",
    },
  });

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "security@assignx.in";
  if (resendKey) {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: {
        authorization: `Bearer ${resendKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: verifiedEmail,
        subject: "Your Dolancer payout verification code",
        text: `Your verification code to update payout details is ${code}. It expires in 10 minutes.`,
      }),
    });
  }

  return jsonResponse({ sent: true, channel: "verified_email" });
});
