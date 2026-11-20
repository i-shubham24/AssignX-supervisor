# AssignX Supervisor Portal

Internal web app for AssignX staff: QQD (quotes and payouts), Supervisors (doers, quality checks, delivery) and Support (complaints and refunds). One app; the sidebar and actions follow your role.

```bash
npm install
npm run dev      # demo data at http://127.0.0.1:3200
npm run verify   # typecheck, lint, scans, build: the release gate
```

In demo mode the sign-in screen lets you pick a role, and buttons marked "Demo" play the client and doer side so you can walk a project from quote to payout.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on demo data |
| `npm run dev:live` | Dev server against Supabase (fill `.env.local`) |
| `npm run build` | Production build. Demo mode is off unless set |
| `npm run build:demo` | Production build on demo data, with a warning banner |
| `npm run check:security` | Blocks raw HTML, eval, auth in localStorage, string-built query filters, console.log |
| `npm run check:dist` | Fails if source maps or key material are in the build |
| `npm run audit` | Production dependency audit |

## Layout

```
src/
  api/          portal.ts (one function per backend endpoint), hooks.ts (queries and actions)
  demo/         seed data and the in-memory store that behaves like the backend
  types/        domain.ts: the data contract
  lib/          config, money, time, SLA, input safety, URL safety, env guard
  components/   ui (buttons, fields, dialogs), portal (cards, tables, charts, pills)
  features/     one folder per area: overview, qqd, supervisor, support, projects, moderation
  layouts/      the signed-in shell
```

## Rules

- Money is integer minor units. Doer payouts are always INR.
- Clients see staff as "Coordinator" and doers as "[Discipline] Expert". Never names, codes or payouts.
- No em dashes, no emojis, never the word escrow (`npm run check:copy`).
- Only the publishable Supabase key may ship (`npm run check:secrets`).

Docs: `docs/PLAN.md`, `docs/BACKEND-CONTRACT.md`, `docs/SECURITY.md`.
