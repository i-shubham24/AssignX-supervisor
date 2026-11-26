/**
 * QA Phase 5: Role Permission Matrix (NFR-024 / AC-31) & Security/Leak Matrix (NFR-023 / AC-02).
 *
 * Verifies every segment boundary, object-level ownership (BOLA) check,
 * anonymity rule, and input/URL sanitization boundary.
 */

import * as db from "../src/demo/db";
import { CLIENT_LABEL } from "../src/lib/config";
import { checkWorkspaceUrl } from "../src/lib/safe-url";
import { cleanText, detectBriefPii } from "../src/lib/input-safety";

console.log("=================================================");
console.log("QA PHASE 5: PERMISSION & SECURITY MATRIX");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

function expectThrows(fn: () => unknown, label: string, expectedMessage?: string) {
  try {
    fn();
    failed++;
    console.error(`  ✗ FAIL: Expected rejection for ${label}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (expectedMessage && !msg.includes(expectedMessage)) {
      failed++;
      console.error(`  ✗ FAIL: ${label} threw "${msg}" instead of matching "${expectedMessage}"`);
      return;
    }
    passed++;
    console.log(`  ✓ Blocked: ${label}`);
  }
}

console.log("1. Role Permission Matrix (NFR-024 / AC-31):");
// Supervisors cannot access QQD money or admin operations.
expectThrows(
  () => db.sendQuote("p-1284", { amount: 100_00, currency: "EUR", delivery_duration_hours: 24, expected_doer_cost_inr: 4000_00, note: "" }, "op-kabir"),
  "Supervisor blocked from QQD sendQuote",
);
expectThrows(() => db.executePayout("pd-1", "op-kabir"), "Supervisor blocked from QQD executePayout");
expectThrows(() => db.executeRefund("rf-1", "op-kabir"), "Supervisor blocked from QQD executeRefund");
expectThrows(() => db.decideSupervisorApplication("sa-1", true, "", "op-kabir"), "Supervisor blocked from deciding supervisor applications");
expectThrows(() => db.conductDoerAction("d-1001", { action: "warning", reason: "Unauthorized attempt by supervisor" }, "op-kabir"), "Supervisor blocked from QQD conduct actions");

// Supervisors cannot read or mutate another supervisor's project (BOLA / NFR-013: same error as missing).
expectThrows(() => db.read.project("p-1224", "op-kabir"), "Cross-supervisor read returns indistinguishable missing error", "That project no longer exists.");
expectThrows(() => db.updateProgress("p-1219", 50, "Test update", "op-kabir"), "Cross-supervisor write blocked");

// Support cannot execute payouts, send offers, deliver projects, or post in internal doer chat.
expectThrows(() => db.executePayout("pd-1", "op-devika"), "Support blocked from executePayout");
expectThrows(() => db.executeRefund("rf-1", "op-devika"), "Support blocked from executeRefund");
expectThrows(() => db.deliver("p-1251", "Delivery", "op-devika"), "Support blocked from deliver");
expectThrows(() => db.sendMessage("p-1259", "internal", "Internal ping", "op-devika"), "Support blocked from internal doer chat");
expectThrows(() => db.conductDoerAction("d-1001", { action: "warning", reason: "Support cannot suspend directly" }, "op-devika"), "Support blocked from QQD conduct action");

// QQD cannot decide fault liability (supervisor decides), recommend refunds (Support decides), or post in internal chat once supervisor assigned.
expectThrows(() => db.recommendRefund("t-412", { kind: "full", amount: 8500_00, currency: "INR", note: "QQD cannot self-recommend refund." }, "op-meera"), "QQD blocked from Support recommendRefund");
expectThrows(() => db.decideLiability("rf-1", "not_at_fault", "QQD cannot override supervisor liability.", null, "op-meera"), "QQD blocked from supervisor decideLiability");
expectThrows(() => db.sendMessage("p-1259", "internal", "Internal QQD post", "op-meera"), "QQD blocked from internal chat once supervised");

console.log("\n2. Anonymity, URL & Sanitization Matrix (NFR-023 / AC-02):");
assert(CLIENT_LABEL.coordinator === "Coordinator", 'Client-facing label remains "Coordinator"');
assert(!checkWorkspaceUrl("javascript:alert(1)").ok, "Workspace validator blocks javascript: scheme");
assert(!checkWorkspaceUrl("https://127.0.0.1/workspace").ok, "Workspace validator blocks loopback SSRF IP");
assert(!checkWorkspaceUrl("https://intranet.internal/docs").ok, "Workspace validator blocks .internal hostnames");
assert(cleanText("report\u202efdp.exe\u200b", 100) === "reportfdp.exe", "cleanText strips BiDi override and zero-width markers");
assert(detectBriefPii("Reach out to oliver@agency.co.uk", "Oliver Grant").includes("email address"), "Brief PII scanner flags embedded client contact email");

const pack = db.buildChargebackEvidence("p-1228", "op-meera");
assert(!JSON.stringify(pack).includes("@assignx.internal"), "Chargeback evidence export excludes internal staff email addresses");

console.log(`\n=================================================`);
console.log(`QA Phase 5 Summary: ${passed} passed, ${failed} failed`);
console.log(`=================================================\n`);

if (failed > 0) process.exit(1);
