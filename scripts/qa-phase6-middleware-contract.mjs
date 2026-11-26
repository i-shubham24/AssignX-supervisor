import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];

function readText(relPath) {
  const abs = resolve(root, relPath);
  if (!existsSync(abs)) {
    failures.push(`Missing required file: ${relPath}`);
    return "";
  }
  return readFileSync(abs, "utf8");
}

function expectIncludes(relPath, content, needle, { caseInsensitive = false } = {}) {
  if (!content) return;
  const hay = caseInsensitive ? content.toLowerCase() : content;
  const target = caseInsensitive ? needle.toLowerCase() : needle;
  if (!hay.includes(target)) {
    failures.push(`${relPath}: missing expected token "${needle}"`);
  }
}

const migration = readText("supabase/migrations/0171_supervisor_portal_middleware.sql");
for (const token of [
  "portal_segment",
  "claim_project_as_doer",
  "respond_to_doer_offer",
  "set_working_doc",
  "rating_level",
  "submit_screened_message",
  "payout_methods_doer",
  "payouts_doer",
  "projects_doer",
  "project_doers",
  "doer_ratings",
  "doer_conduct_log",
  "refund_requests",
  "portal_idempotency",
  "revoke insert on public.messages from anon, authenticated",
  "security_barrier = true",
]) {
  expectIncludes("supabase/migrations/0171_supervisor_portal_middleware.sql", migration, token, {
    caseInsensitive: true,
  });
}

const cors = readText("supabase/functions/_shared/cors.ts");
expectIncludes("supabase/functions/_shared/cors.ts", cors, "idempotency-key", {
  caseInsensitive: true,
});
expectIncludes("supabase/functions/_shared/cors.ts", cors, "GET, POST, PATCH, OPTIONS");

const admin = readText("supabase/functions/_shared/admin.ts");
expectIncludes("supabase/functions/_shared/admin.ts", admin, "requireStaffSession");
expectIncludes("supabase/functions/_shared/admin.ts", admin, "aal2");

readText("supabase/functions/portal-api/index.ts");
readText("supabase/functions/portal-api/routes-read.ts");
readText("supabase/functions/portal-api/routes-write.ts");

const screenMsg = readText("supabase/functions/screen-message/index.ts");
expectIncludes("supabase/functions/screen-message/index.ts", screenMsg, "FAIL_CLOSED");
expectIncludes("supabase/functions/screen-message/index.ts", screenMsg, "800");

readText("supabase/functions/check-payout-account/index.ts");

const payoutCode = readText("supabase/functions/send-payout-code/index.ts");
expectIncludes("supabase/functions/send-payout-code/index.ts", payoutCode, "verified_email");

const cron = readText("supabase/functions/cron-middleware/index.ts");
expectIncludes("supabase/functions/cron-middleware/index.ts", cron, "cron-middleware");

const apiClient = readText("src/api/client.ts");
expectIncludes("src/api/client.ts", apiClient, "resolvePortalUrl");
expectIncludes("src/api/client.ts", apiClient, "/functions/v1/portal-api");

if (failures.length > 0) {
  console.error("Phase 6 middleware contract check FAILED:");
  for (const msg of failures) {
    console.error(`  - ${msg}`);
  }
  process.exit(1);
}

console.log("Phase 6 middleware contract check passed (all 10 artifacts verified).");
