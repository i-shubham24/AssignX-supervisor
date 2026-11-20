# Supervisor Portal: plan

## What this is

The internal web app for AssignX staff. One app, three roles, chosen at sign-in:

- **QQD**: quotes new work, assigns supervisors, checks doer documents, runs payouts and refunds.
- **Supervisor**: finds doers, sets up their workspace, reviews work and delivers it.
- **Support**: handles complaints and recommends refunds.

The spec is the PRD (AssignExperts Platform PRD v1.0, section 11). Where the current backend differs, the portal follows the PRD and the gap is listed in `BACKEND-CONTRACT.md`.

## Decisions

| Topic | Decision |
| --- | --- |
| Stack | React 19, Vite, TypeScript, Tailwind v4, TanStack Query, Zustand, Radix. Same as Dolancer |
| Look | AssignX client app colours and type (coral, Plus Jakarta Sans), light sidebar, live dashboards inspired by the shared Dribbble references |
| Data | Typed api layer over an in-memory demo store until the backend is ready |
| Words | Plain and short. No spec jargon on screen |

## Built

| Area | Screens |
| --- | --- |
| Shell | Sign-in with authenticator step, sidebar per role, search (Ctrl K), notifications, on-duty switch, dark mode, mobile menu |
| QQD | Dashboard, quotes queue, quote screen with price guide, assign supervisor, payouts with TDS, refunds, doer checks, people, training, price guide, transactions |
| Supervisor | Dashboard, my projects, find a doer, project workspace with both chats, quality check and delivery, messages on hold, doers, new doer calls, my stats |
| Support | Dashboard, tickets, ticket detail with internal notes and refund recommendation, all projects, messages on hold |

## Next

1. **Backend wiring**: replace each `call(...)` in `src/api/portal.ts` once its endpoint exists. Start with read endpoints, then quotes and offers, then money.
2. **Realtime**: swap the 15 to 30 second polling for private broadcast channels (pattern in Dolancer `src/lib/realtime.ts`).
3. **Product decisions** listed at the end of `BACKEND-CONTRACT.md` (client-facing supervisor identity, milestones versus one quote).
4. **Tests**: unit tests for `src/demo/db.ts` gates (they become the backend acceptance tests), then end-to-end runs of the golden path.

## Run it

```bash
npm install
npm run dev        # demo data, http://127.0.0.1:3200
npm run verify     # the release gate
```
