import { preflightResponse, jsonResponse } from "../_shared/cors.ts";
import { requireAuthenticatedUser } from "../_shared/admin.ts";

const RAZORPAY_BASE = "https://api.razorpay.com/v1";

/**
 * check-payout-account: Server-side account holder name validation for Dolancer
 * UPI VPAs and Bank Accounts (Dolancer BACKEND-HANDOFF §6).
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflightResponse();
  if (req.method !== "POST") return jsonResponse({ error: "method not allowed" }, 405);

  const auth = await requireAuthenticatedUser(req);
  if (auth instanceof Response) return auth;

  const keyId = Deno.env.get("RAZORPAY_KEY_ID");
  const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");
  const accountNumber = Deno.env.get("RAZORPAYX_ACCOUNT_NUMBER");
  if (!keyId || !keySecret || !accountNumber) {
    return jsonResponse({ error: "payout account validation is not configured" }, 503);
  }

  let body: { kind?: unknown; vpa?: unknown; accountNumber?: unknown; ifsc?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return jsonResponse({ error: "expected a JSON body" }, 400);
  }

  const isUpi = body.kind === "upi";
  const isBank = body.kind === "bank";
  if (!isUpi && !isBank) return jsonResponse({ error: "kind must be 'upi' or 'bank'" }, 400);

  const basicAuth = `Basic ${btoa(`${keyId}:${keySecret}`)}`;
  const fundAccount = isUpi
    ? {
        account_type: "vpa",
        vpa: { address: typeof body.vpa === "string" ? body.vpa.trim() : "" },
      }
    : {
        account_type: "bank_account",
        bank_account: {
          name: "Payee Verification",
          ifsc: typeof body.ifsc === "string" ? body.ifsc.trim().toUpperCase() : "",
          account_number: typeof body.accountNumber === "string" ? body.accountNumber.trim() : "",
        },
      };

  const res = await fetch(`${RAZORPAY_BASE}/fund_accounts/validations`, {
    method: "POST",
    signal: AbortSignal.timeout(20_000),
    headers: { authorization: basicAuth, "content-type": "application/json" },
    body: JSON.stringify({
      account_number: accountNumber,
      fund_account: {
        ...fundAccount,
        contact: {
          name: "AssignX Payee",
          type: "vendor",
          reference_id: auth.user.id,
        },
      },
      amount: isBank ? 100 : undefined,
      currency: "INR",
    }),
  });

  const parsed = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!res.ok || !parsed) {
    const err = parsed?.error as { description?: string } | undefined;
    return jsonResponse({ error: err?.description ?? "account verification failed" }, 502);
  }

  const results = parsed.results as { registered_name?: string; account_status?: string } | undefined;
  if (results?.account_status === "invalid") {
    return jsonResponse({ error: "account or VPA could not be verified" }, 422);
  }

  return jsonResponse({ holderName: results?.registered_name ?? "" });
});
