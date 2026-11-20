#!/usr/bin/env node
/**
 * QA Phase 3: Responsive Layout & Breakpoints Audit.
 *
 * Verifies that:
 * 1. Mobile menu & sidebar drawer exist and correctly transition across breakpoints (lg:hidden vs hidden lg:flex).
 * 2. All tables (QueueTable, custom tables) are wrapped in horizontal overflow containers.
 * 3. All modals, dialogs, and popovers use viewport-relative responsive constraints (e.g., calc(100vw - Xpx)).
 * 4. Critical multi-column grid layouts have mobile-first fallback (grid-cols-1) scaling up at sm, md, lg, xl, or 2xl.
 * 5. Fixed-width elements (charts, select inputs) provide scroll containers or mobile width overrides.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

console.log("=================================================");
console.log("QA PHASE 3: RESPONSIVE LAYOUT & BREAKPOINTS AUDIT");
console.log("=================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

// 1. Shell & Navigation Responsive Structure
console.log("\n1. Shell & Navigation Breakpoint Architecture:");
const portalShellSrc = readFileSync(join(SRC, "layouts/PortalShell.tsx"), "utf8");

assert(portalShellSrc.includes('className="hidden lg:flex"'), "Desktop sidebar hidden below lg breakpoint (1024px)");
assert(portalShellSrc.includes("Dialog.Root open={drawer}"), "Mobile drawer component exists for viewports < lg");
assert(portalShellSrc.includes("w-[284px] max-w-[85vw]"), "Mobile drawer constrained to max 85vw on small devices");
assert(portalShellSrc.includes('className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line-card bg-surface text-ink-2 shadow-soft-sm lg:hidden"'), "Mobile hamburger toggle present and hidden on lg+");
assert(portalShellSrc.includes("px-4 pb-16 pt-3 sm:px-6 lg:px-7"), "Main content area has fluid responsive padding (px-4 -> sm:px-6 -> lg:px-7)");
assert(portalShellSrc.includes("max-w-[1440px]"), "Main content has max-width constraint for ultra-wide screens");

// 2. Dialog & Popover Responsive Viewport Clamping
console.log("\n2. Dialogs, Drawers & Popovers Viewport Clamping:");
const overlaySrc = readFileSync(join(SRC, "components/ui/overlay.tsx"), "utf8");
assert(overlaySrc.includes("w-[calc(100vw-32px)]"), "DialogContent width clamped with margin on mobile");
assert(overlaySrc.includes("max-h-[80vh]"), "DialogContent height clamped to 80vh to prevent off-screen overflow");
assert(overlaySrc.includes("overflow-y-auto"), "DialogContent body scrolls vertically if content exceeds viewport");

const commandPaletteSrc = readFileSync(join(SRC, "features/shell/CommandPalette.tsx"), "utf8");
assert(commandPaletteSrc.includes("w-[calc(100vw-32px)]"), "Command palette width clamped on mobile viewports");

const notificationsSrc = portalShellSrc;
assert(notificationsSrc.includes("w-[min(380px,calc(100vw-24px))]"), "Notifications popover clamped with 24px mobile safety gutter");

// 3. Table Horizontal Overflow Protection
console.log("\n3. Data Tables & Grids Horizontal Scroll Safety:");
const queueTableSrc = readFileSync(join(SRC, "components/portal/QueueTable.tsx"), "utf8");
assert(queueTableSrc.includes("overflow-x-auto"), "QueueTable wraps HTML table in horizontal overflow container");

const disbursementSrc = readFileSync(join(SRC, "features/qqd/DisbursementPage.tsx"), "utf8");
assert(disbursementSrc.includes("overflow-x-auto"), "Disbursement table wrapped in overflow-x-auto container");

// 4. Multi-Column Grid Mobile-First Verification
console.log("\n4. Multi-column Grid Mobile-First Breakpoint Checks:");

const checkGridMobileFirst = (filePath, expectedBreakpoints, label) => {
  const content = readFileSync(filePath, "utf8");
  for (const bp of expectedBreakpoints) {
    assert(content.includes(bp), `${label}: includes responsive breakpoint "${bp}"`);
  }
};

checkGridMobileFirst(
  join(SRC, "features/auth/SignInPage.tsx"),
  ["grid-cols-1", "lg:grid-cols-2"],
  "SignInPage (Hero split)"
);

checkGridMobileFirst(
  join(SRC, "features/overview/OverviewPage.tsx"),
  ["grid-cols-1", "lg:grid-cols-[280px_minmax(0,1fr)]", "xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"],
  "OverviewPage (Hero & KPI layout)"
);

checkGridMobileFirst(
  join(SRC, "features/projects/ProjectWorkspace.tsx"),
  ["xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"],
  "ProjectWorkspace (Chat / Details split at xl)"
);

checkGridMobileFirst(
  join(SRC, "features/projects/OfferDialog.tsx"),
  ["grid-cols-1", "md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]"],
  "OfferDialog (Doer pool and Payout form split)"
);

checkGridMobileFirst(
  join(SRC, "features/supervisor/QcReviewPage.tsx"),
  ["lg:grid-cols-2", "2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px]"],
  "QcReviewPage (3-tier progressive enhancement)"
);

checkGridMobileFirst(
  join(SRC, "features/support/TicketDetailPage.tsx"),
  ["xl:grid-cols-[minmax(0,1fr)_340px]"],
  "TicketDetailPage (Conversation and Sidebar split at xl)"
);

// 5. Fixed-Width Control Mobile Overrides
console.log("\n5. Fixed-width Controls & Chart Mobile Safety:");
const doersPageSrc = readFileSync(join(SRC, "features/supervisor/DoersPage.tsx"), "utf8");
assert(doersPageSrc.includes("w-full sm:w-64") || doersPageSrc.includes("w-full sm:w-48") || doersPageSrc.includes("w-full sm:w-32"), "DoersPage filter selects expand to 100% width below sm");

const offerDialogSrc = readFileSync(join(SRC, "features/projects/OfferDialog.tsx"), "utf8");
assert(offerDialogSrc.includes("w-full sm:w-44") || offerDialogSrc.includes("w-full sm:w-28"), "OfferDialog selects use w-full below sm");

const widgetsSrc = readFileSync(join(SRC, "features/overview/widgets.tsx"), "utf8");
assert(widgetsSrc.includes("overflow-x-auto"), "DueChart includes horizontal scroll container for narrow devices");

console.log(`\n=================================================`);
console.log(`QA Phase 3 Summary: ${passed} passed, ${failed} failed`);
console.log(`=================================================\n`);

if (failed > 0) process.exit(1);
