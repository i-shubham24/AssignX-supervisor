#!/usr/bin/env node
/**
 * Checks the built bundle before deploy:
 * - no .map files (exposed source maps hand out the full source),
 * - no sourceMappingURL comments pointing at them,
 * - no privileged key material made it into the output.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const DIST = join(process.cwd(), "dist");
if (!existsSync(DIST)) {
  console.error("dist-scan: no dist folder. Run a build first.");
  process.exit(1);
}

const SECRET = new RegExp(["sb_" + "secret_", "service" + "_role", "rzp_(live|test)_", "-----BEGIN [A-Z ]*PRIVATE KEY"].join("|"));
const findings = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
      continue;
    }
    if (extname(entry) === ".map") findings.push(`${full}  source map file`);
    if (![".js", ".css", ".html"].includes(extname(entry))) continue;
    const text = readFileSync(full, "utf8");
    if (/sourceMappingURL=/.test(text)) findings.push(`${full}  sourceMappingURL reference`);
    if (SECRET.test(text)) findings.push(`${full}  privileged key material`);
  }
}

walk(DIST);

if (findings.length) {
  console.error("dist-scan found problems:\n");
  for (const f of findings) console.error("  " + f);
  process.exit(1);
}
console.log("dist-scan: clean (no source maps, no key material)");
