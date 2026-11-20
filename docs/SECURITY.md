# Supervisor Portal: security checklist

Status of each item. "Frontend" means done in this repo. "Backend" means the backend team must do it; the frontend checks are convenience, not protection, because anyone can call an API directly.

| Item | Status | What is in place, or what the backend must do |
| --- | --- | --- |
| SQL injection | Frontend done, Backend required | No query is built from strings. `scripts/security-scan.mjs` fails the build on template-literal PostgREST filters. Backend: parameterised queries and RPCs only; never interpolate user input into SQL or filter strings |
| Cross-site scripting | Frontend done | React escaping only. ESLint and the security scan block `dangerouslySetInnerHTML`, `innerHTML`, `eval`. Data-sourced links go through `safeWorkspaceHref` or `internalPath`. Strict CSP in `vercel.json` (`script-src 'self'`) |
| CSRF | Frontend done, Backend required | Requests use a bearer token, not cookies, so cross-site forms cannot ride the session. CSP `form-action 'self'`. Backend: if you move tokens to cookies (recommended, see below), use `SameSite=Strict` plus a CSRF token on every write |
| File uploads | Frontend done, Backend required | `checkUpload` sniffs real file type from bytes, blocks executables, SVG and HTML, size limits per use, rejects PDFs with scripts or embedded files. Snapshots are redrawn to strip metadata. Backend: repeat every check, malware-scan before the file is available, private storage, signed URLs that expire in 15 minutes |
| Broken object level authorisation | Reference done, Backend required | The demo store checks ownership on every write (a supervisor can only act on their own projects). Backend: same check in RLS or the endpoint for every object; return 404 for objects outside scope |
| Rate limiting | Frontend done, Backend required | Chat is limited to 20 messages a minute in the UI; 429 responses show a wait message. Backend: limits on auth, messages, uploads and tickets |
| JWT secrets and API keys | Frontend done | `src/lib/env.ts` refuses to boot with anything key-shaped; `secret-scan` and `dist-scan` block keys in source and bundle. Only the publishable key ships. Backend: secrets live in edge-function secrets only; rotate any key that was ever in a doc or repo (`docs/ENVIRONMENT.md` in the old monorepo holds real values) |
| Password hashing | Not applicable | Sign-in is passwordless (email code plus authenticator). If passwords are ever added, use Argon2id |
| Multi-factor auth | Frontend done, Backend required | Sign-in has an authenticator step. Backend: enforce `aal2` in RLS and on every portal RPC. Today the old schema checks it only in app middleware, so a direct API call with a weaker session works |
| CORS | Backend required | The SPA is static. Backend: allow only the portal origin on Supabase and any API; no wildcard origins with credentials |
| Tokens in localStorage | Frontend done | Tokens are in sessionStorage and old localStorage auth keys are purged on load. localStorage holds UI preferences only, and the security scan blocks auth writes to it. Next step for the backend: move to HTTP-only cookies through a small auth proxy (PRD NFR-011) |
| Server-side permissions and RLS | Backend required | Hiding a nav item is never the control. Every endpoint must check role and ownership. Known holes in the current schema: suspended accounts can clear their own `suspended_at`; any account can open a ticket on any project and freeze its payout; two views likely lost `security_barrier`; `set-payout-method` has no role or `aal2` check |
| Webhook signatures | Backend required | Verify Razorpay and RazorpayX signatures before any state change, dedupe by event id, never advance status from a browser success |
| SSRF | Frontend done, Backend required | Working links must be https on an approved workspace host; literal IPs, internal names and custom ports are refused. Backend: same allowlist, and never fetch a user-supplied URL from the server without it |
| Source maps | Frontend done | `sourcemap: false`; `npm run check:dist` fails the release if any `.map` file or reference exists |
| Default credentials | Frontend done | Demo mode is off in production builds unless explicitly enabled, and a production demo build shows a permanent warning banner. No seeded passwords exist |
| Sensitive data in logs | Frontend done | `console.log` is banned by ESLint and the scan; error detail is logged in development only, and users see safe messages |
| Vulnerable dependencies | Frontend done | Production dependencies: 0 known vulnerabilities (unused `zod` removed). Dev-only: `picomatch` 4.0.7 inside Vite has a ReDoS advisory with no patched release yet; it runs at build time on our own globs and does not ship. Re-check with `npm run audit` |

## Release gate

`npm run verify` runs typecheck, lint, secret scan, copy guard, security scan, a production build and the dist scan. Do not deploy if it fails.
