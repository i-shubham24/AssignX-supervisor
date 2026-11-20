import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "**/._*", "scripts/**"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-explicit-any": "error",
      // Keep sensitive data out of logs: no console.log; warn/error are dev-gated in code.
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/service_role|sb_secret_/]",  // pragma: allowlist secret
          message: "Secret-key material must never appear in this codebase.",
        },
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: "Raw HTML bypasses React's XSS escaping. Render text instead.",
        },
        {
          selector: "JSXAttribute[name.name='href'][value.type='JSXExpressionContainer'] > JSXExpressionContainer > MemberExpression[property.name=/link|url|href/i]",
          message: "Pass data-sourced URLs through safeWorkspaceHref or internalPath before rendering.",
        },
      ],
    },
  },
);
