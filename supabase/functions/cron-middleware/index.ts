import { createPrivilegedClient } from "../_shared/admin.ts";
import { jsonResponse } from "../_shared/cors.ts";

/**
 * cron-middleware: Scheduled sweeper for PRD time-based gates (triggered every 5-15m
 * via Supabase pg_cron + Vault secret). Covers:
 *   1. 2-hour Doer Offer Expiry Sweeper (PRD 10.5)
 *   2. 24-hour Post-Expiry Quote Auto-Cancel (PRD 6.8)
 *   3. 14-day Silent Payout Release Eligibility Marking (BR-007)
 *   4. Stalled Queue SLA Scan (PRD 5.2)
 *   5. 30-day Raw PAN Document Purge keeping pan_hash (BR-024)
 */
Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_WORKER_SECRET");
  if (!secret || req.headers.get("x-worker-secret") !== secret) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  const admin = createPrivilegedClient();
  if (!admin) return jsonResponse({ error: "not configured" }, 503);

  const now = new Date();
  const nowIso = now.toISOString();

  // 1. Expire direct doer offers past 2h window.
  const { data: expiredOffers } = await admin
    .from("project_doers")
    .update({ status: "expired" })
    .eq("status", "offered")
    .lt("offer_expires_at", nowIso)
    .select("id, project_id");

  const projIncrement = new Map<string, number>();
  for (const row of (expiredOffers ?? []) as { id: string; project_id: string }[]) {
    projIncrement.set(row.project_id, (projIncrement.get(row.project_id) ?? 0) + 1);
  }
  for (const [projectId, delta] of projIncrement.entries()) {
    const { data: proj } = await admin.from("projects").select("failed_offer_count").eq("id", projectId).maybeSingle();
    const current = ((proj as { failed_offer_count?: number } | null)?.failed_offer_count) ?? 0;
    await admin.from("projects").update({ failed_offer_count: current + delta, updated_at: nowIso }).eq("id", projectId);
  }

  // 2. Cancel unpaid quotes 24h after quote_expires_at.
  const cancelCutoff = new Date(now.getTime() - 24 * 3_600_000).toISOString();
  const { data: cancelledQuotes } = await admin
    .from("projects")
    .update({
      status: "cancelled",
      cancellation_reason: "quote_expired",
      cancelled_at: nowIso,
      updated_at: nowIso,
    })
    .eq("status", "quoted")
    .not("quote_expires_at", "is", null)
    .lt("quote_expires_at", cancelCutoff)
    .select("id");

  // 3. Auto-mark silent payout release eligibility 14 days after delivery.
  const releaseCutoff = new Date(now.getTime() - 14 * 86_400_000).toISOString();
  const { data: silentReleases } = await admin
    .from("projects")
    .update({ payout_released_at: nowIso, updated_at: nowIso })
    .eq("status", "delivered")
    .is("payout_released_at", null)
    .lt("delivered_at", releaseCutoff)
    .select("id");

  // 4. Broadcast stalled queues for QQD dashboard SLA refresh.
  await admin.channel("queue:stalled").send({
    type: "broadcast",
    event: "change",
    payload: { scanned_at: nowIso },
  });

  // 5. Purge raw KYC PAN storage files 30 days post-approval (pan_hash stays on profiles, BR-024).
  const kycPurgeCutoff = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const { data: staleKyc } = await admin
    .from("kyc")
    .select("id, national_id_doc_ref")
    .eq("status", "approved")
    .not("national_id_doc_ref", "is", null)
    .lt("updated_at", kycPurgeCutoff)
    .limit(50);

  let purgedKycFiles = 0;
  for (const row of (staleKyc ?? []) as { id: string; national_id_doc_ref: string }[]) {
    if (row.national_id_doc_ref) {
      await admin.storage.from("kyc-docs").remove([row.national_id_doc_ref]);
      await admin.from("kyc").update({ national_id_doc_ref: null, updated_at: nowIso }).eq("id", row.id);
      purgedKycFiles += 1;
    }
  }

  return jsonResponse({
    ok: true,
    expired_offers: expiredOffers?.length ?? 0,
    cancelled_quotes: cancelledQuotes?.length ?? 0,
    silent_releases: silentReleases?.length ?? 0,
    purged_kyc_files: purgedKycFiles,
  });
});
