#!/usr/bin/env node
/**
 * Source-level security rules for the portal. Runs in `npm run verify`.
 *
 * - No raw HTML injection (dangerouslySetInnerHTML, innerHTML, outerHTML, insertAdjacentHTML,
 *   document.write): React's escaping is the XSS control, so nothing may bypass it.
 * - No dynamic code (eval, new Function, string setTimeout).
 * - No auth material in localStorage: tokens live in sessionStorage today and must move to
 *   HTTP-only cookies (PRD NFR-011); localStorage holds UI preferences only.
 * - No hand-built query filters: PostgREST .or()/.filter() strings built from template
 *   literals are the SQL-injection-shaped hole in a Supabase client.
 * - No console.log of anything (sensitive data stays out of logs); warn/error only, dev-gated.
 * - No source maps enabled in the Vite config.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const EXT = new Set([".ts", ".tsx"]);

const RULES = [
  [/dangerouslySetInnerHTML/, "raw HTML injection (dangerouslySetInnerHTML)"],
  [/\.(innerHTML|outerHTML)\s*=/, "raw HTML assignment"],
  [/insertAdjacentHTML|document\.write\(/, "raw HTML insertion"],
  [/\beval\(|new Function\(/, "dynamic code execution"],
  [/setTimeout\(\s*["'`]/, "string passed to setTimeout"],
  [/localStorage\.setItem\([^)]*(token|auth|session|jwt)/i, "auth material written to localStorage"],
  [/\.(or|filter)\(\s*`/, "query filter built from a template literal (injection risk)"],
  [/console\.log\(/, "console.log (keep sensitive data out of logs)"],
];

const findings = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (!EXT.has(extname(entry))) continue;
    const lines = readFileSync(full, "utf8").split(/\r?\n/);
    lines.forEach((line, i) => {
      if (line.includes("security-scan: allow")) return;
      for (const [pattern, label] of RULES) {
        if (pattern.test(line)) findings.push(`${full.replace(ROOT, ".")}:${i + 1}  ${label}`);
      }
    });
  }
}

walk(SRC);

const vite = readFileSync(join(ROOT, "vite.config.ts"), "utf8");
if (/sourcemap:\s*true/.test(vite)) findings.push("./vite.config.ts  production source maps are enabled");

if (findings.length) {
  console.error("Security rule violations:\n");
  for (const f of findings) console.error("  " + f);
  process.exit(1);
}
console.log("security-scan: clean");
