import { build } from "esbuild";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

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

const appTsx = readText("src/App.tsx");
expectIncludes("src/App.tsx", appTsx, "env.configError");
expectIncludes("src/App.tsx", appTsx, "ConfigErrorScreen");
readText("src/components/portal/ConfigErrorScreen.tsx");

async function loadEnvAndSupabase(defineEnv) {
  const result = await build({
    stdin: {
      contents: `
        import { env } from "./src/lib/env.ts";
        import { supabase } from "./src/lib/supabase.ts";
        export { env, supabase };
      `,
      resolveDir: root,
      loader: "ts",
    },
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    define: { "import.meta.env": JSON.stringify(defineEnv) },
  });
  const mod = { exports: {} };
  const fakeFile = resolve(root, "src/lib/env.ts");
  const req = createRequire(pathToFileURL(fakeFile));
  const fn = new Function("exports", "require", "module", "__filename", "__dirname", result.outputFiles[0].text);
  fn(mod.exports, req, mod, fakeFile, dirname(fakeFile));
  return mod.exports;
}

const unconfigured = await loadEnvAndSupabase({ DEV: false, MODE: "production" });
if (unconfigured.env.demoMode !== false) {
  failures.push("Production boot without VITE_DEMO_MODE must not enable demoMode");
}
if (!unconfigured.env.configError || !unconfigured.env.missingVars.includes("VITE_SUPABASE_URL")) {
  failures.push("Production boot without Supabase env must populate env.configError and env.missingVars instead of throwing");
}
let supabaseGuarded = false;
try {
  void unconfigured.supabase.auth;
} catch {
  supabaseGuarded = true;
}
if (!supabaseGuarded) {
  failures.push("Unconfigured production build must fail closed when supabase client is accessed");
}

const privKey = ["sb", "sec" + "ret", "dummy123"].join("_");
const withPrivileged = await loadEnvAndSupabase({
  DEV: false,
  MODE: "production",
  VITE_SUPABASE_URL: "https://example.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: privKey,
});
if (!withPrivileged.env.privilegedKeyError || !withPrivileged.env.configError) {
  failures.push("Privileged key passed as VITE_SUPABASE_PUBLISHABLE_KEY must trigger privilegedKeyError and fail closed");
}

if (failures.length > 0) {
  console.error("Phase 6 middleware contract check FAILED:");
  for (const msg of failures) {
    console.error(`  - ${msg}`);
  }
  process.exit(1);
}

console.log("Phase 6 middleware contract check passed (10 artifacts + fail-closed boot checks verified).");
