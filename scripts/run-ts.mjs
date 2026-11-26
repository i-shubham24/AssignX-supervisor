#!/usr/bin/env node
/**
 * Executes TypeScript QA scripts using the project's local esbuild + src/@ alias.
 * Avoids npx cache dependencies so workflow and security tests work offline.
 */
import { build } from "esbuild";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/run-ts.mjs <script.ts>");
  process.exit(1);
}

const root = process.cwd();
const full = resolve(root, target);

const aliasPlugin = {
  name: "src-alias",
  setup(b) {
    b.onResolve({ filter: /^@\// }, (args) => {
      const base = resolve(root, "src", args.path.slice(2));
      for (const ext of ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx"]) {
        const candidate = `${base}${ext}`;
        if (existsSync(candidate)) return { path: candidate };
      }
      return { path: base };
    });
  },
};

const result = await build({
  entryPoints: [full],
  bundle: true,
  platform: "node",
  format: "cjs",
  write: false,
  plugins: [aliasPlugin],
  define: {
    "import.meta.env": JSON.stringify({ DEV: false, MODE: "test", VITE_DEMO_MODE: "true" }),
  },
});

const code = result.outputFiles[0].text;
const mod = { exports: {} };
const require = createRequire(pathToFileURL(full));
const fn = new Function("exports", "require", "module", "__filename", "__dirname", code);
fn(mod.exports, require, mod, full, dirname(full));
