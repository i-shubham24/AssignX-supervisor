# Supervisor Portal: backend contract

This is the handoff for the backend team. The portal is frontend-only today. Every screen talks to `src/api/portal.ts`, and each function there names the endpoint it stands for. In demo mode an in-memory store answers (`src/demo/db.ts`). With `VITE_DEMO_MODE=false` each call fails with "not connected yet" until you wire it.

**How to use this file**
1. Implement an endpoint so it returns the shapes in `src/types/domain.ts` (snake_case, PRD section 17 names).
2. Replace the `call(...)` in `src/api/portal.ts` with the real request.
3. Use `src/demo/db.ts` as the reference behaviour. Each mutation there enforces the same gates, transitions and side effects the real endpoint must enforce, with the PRD rule cited.

Money is integer minor units. Fields ending `_inr` are INR paise. `quote_amount` is minor units in `quote_currency`. Timestamps are ISO 8601 UTC.

## Endpoints

| Function | Endpoint | Who | Notes |
| --- | --- | --- | --- |
| `fetchProjects` | `GET /api/portal/queues/:queue` | All | Queue partitions must match `src/features/projects/queues.ts` |
| `fetchProject` | `GET /api/portal/projects/:id` | Scoped | 404 for anything outside the caller's scope, never 403 |
| `fetchMessages` | `GET /api/portal/projects/:id/messages?channel=` | Scoped | Includes held and removed messages for staff (FR-CH-012) |
| `fetchHeld` | `GET /api/portal/queues/moderation` | All | Supervisor: own projects only |
| `fetchDoers`, `fetchDoer`, `fetchDoerProjects` | `GET /api/portal/doers[/:id[/projects]]` | Supervisor, QQD | |
| `fetchTickets`, `fetchTicket` | `GET /api/portal/tickets[/:id]` | Support, QQD | |
| `fetchVerification` | `GET /api/portal/doers?view=verification` | QQD, Supervisor | |
| `fetchRefunds` | `GET /api/portal/refunds` | QQD | |
| `fetchTraining` | `GET /api/portal/training` | QQD | |
| `fetchRateBands` | `GET /api/portal/rate-reference` | QQD | Config table from AdminX |
| `fetchLedger` | `GET /api/portal/ledger` | QQD | Append-only |
| `fetchDisbursements` | `GET /api/portal/queues/disbursement` | QQD | Lines with gross, cumulative FY total, TDS, net |
| `fetchActivity`, `fetchNotifications`, `fetchOperators` | `GET /api/portal/activity`, `/notifications`, `/people?kind=operators` | All | |
| `sendQuote` | `POST /api/portal/projects/:id/quote` | QQD | Block when deadline minus duration is past (FR-SV-005). On an unpaid quote it updates it and posts "Your quote has been updated" |
| `reopenQuote` | `POST /api/portal/projects/:id/reopen-quote` | QQD | Expired or unpaid quote back to the quote queue. A job must also cancel quotes 24h after expiry (PRD 6.8) |
| `fetchApplications`, `decideSupervisorApplication`, `updateApplicationChecks` | `/api/portal/supervisor-applications[/:id[/decide]]` | QQD only | ID check and interview required before approval (FR-SV-014) |
| `fetchTrainingModule`, `updateModule` | `GET /api/portal/training/:id`, `PATCH /training/:id/content` | QQD | Body is plain text; video links limited to YouTube, Vimeo, Loom |
| `fetchWorkspaceLogins`, `addWorkspaceLogins` | `GET/POST /api/portal/workspace-logins` | QQD | Pool of anonymous logins; one per doer per project |
| `assignSupervisor` | `POST /api/portal/projects/:id/assign-supervisor` | QQD | Only paid projects |
| `sendOffer` | `POST /api/portal/projects/:id/offer-doer` | Supervisor | Verified doers only, 3-project cap, 2 hour expiry |
| `withdrawOffer` | `POST /api/portal/offers/:id/withdraw` | Supervisor | |
| `openToPool`, `selfAssign` | `POST /api/portal/projects/:id/open-pool`, `/self-assign` | Supervisor | Only after 2 failed offers (FR-SV-008) |
| `setWorkingLink` | `POST /api/portal/assignments/:id/working-link` | Supervisor | https, approved hosts only (see SECURITY.md) |
| `updateProgress` | `POST /api/portal/projects/:id/progress` | Supervisor | |
| `postSnapshot` | `POST /api/portal/projects/:id/snapshot` | Supervisor | Strip image metadata server-side too |
| `sendMessage` | `POST /api/portal/projects/:id/messages` | Scoped | Coordinator and Support messages are never screened |
| `moderateMessage` | `POST /api/portal/messages/:id/moderate` | Supervisor (own), Support, QQD | |
| `saveQc` | `PATCH /api/portal/projects/:id/qc` | Supervisor | |
| `addDeliverable`, `removeAttachment` | `POST /api/portal/projects/:id/attachments[/:aid/remove]` | Supervisor | Scan before available (NFR-016) |
| `deliver` | `POST /api/portal/projects/:id/deliver` | Supervisor | Needs completed QC and at least one deliverable (FR-SV-010) |
| `sendBack` | `POST /api/portal/projects/:id/send-back` | Supervisor | |
| `releasePayout` | `POST /api/portal/projects/:id/release-payout` | Supervisor | Only 14 days after delivery |
| `submitOwnWork` | `POST /api/portal/projects/:id/submit-own-work` | Supervisor | Self-assigned work only |
| `respondToFlag` | `POST /api/portal/projects/:id/flags/:fid/respond` | Supervisor | Posts to the client thread and marks the flag handled |
| `replaceDoer` | `POST /api/portal/assignments/:id/replace` | Supervisor | Silent to the client; frees the doer's slot; revoke workspace access |
| `fetchProjectHistory` | `GET /api/portal/projects/:id/history` | Scoped | Every action on the project |
| `decideLiability` | `POST /api/portal/refunds/:id/liability` | Supervisor (own project) | Required before QQD can execute the refund |
| `executePayout` | `POST /api/portal/payouts/:id/execute` | QQD only | Idempotency key required, immutable log |
| `executeRefund` | `POST /api/portal/refunds/:id/execute` | QQD only | Idempotency key required |
| `recordDocumentCheck`, `assignOnboarding`, `decideVerification` | `/api/portal/doers/verification/:id[...]` | QQD, Supervisor (assigned) | |
| `createModule`, `setModuleState` | `POST/PATCH /api/portal/training[/:id]` | QQD | |
| `replyTicket`, `updateTicket`, `resolveTicket`, `recommendRefund` | `/api/portal/tickets/:id/...` | Support, QQD | Resolution required to close |
| `setOnDuty`, `markNotificationRead` | `POST /api/portal/me/duty`, `/notifications/read` | All | |

Money endpoints (`executePayout`, `executeRefund`, `sendQuote`) must accept an `Idempotency-Key` header and return the original result on a repeat, so a retried request can never pay twice.

## Gaps between the PRD and the current Supabase schema

The current backend (`D:/Giithub/assign-x/supabase`, migrations 0001 to 0170) implements a different supervisor model than the PRD. The portal is built to the PRD. These need a decision or migration before the portal can go live.

| # | Area | Schema today | Portal and PRD need |
| --- | --- | --- | --- |
| 1 | Roles | `user, supervisor, doer, admin` | Add `qqd` and `support` segments, appointed from AdminX |
| 2 | Quoting | Supervisor claims from a pool, then `submit_quote` | QQD quotes. Supervisor is assigned by QQD after payment |
| 3 | Statuses | 10: submitted, claimed, quoted, paid, in_progress, in_review, delivered, approved, cancelled, draft | 7: awaiting_quote, awaiting_payment, in_progress, in_review, delivered, completed, cancelled. Map or migrate |
| 4 | Doer assignment | Doers self-claim paid work from `doer_pool` | Supervisor offers with a 2 hour expiry; open pool only after 2 failed offers. Dolancer needs an offer accept and decline screen |
| 5 | Multi-doer | One `projects.doer_id` | `project_doers` join table with per-doer payout, scope, working link, liability |
| 6 | Working link | Doer sets it (`set_working_doc`) | Supervisor sets it in a company workspace. Remove the doer RPC |
| 7 | Held messages | No message state, no screening | `messages.state`, `held_reason`, moderation RPC, AI screening that fails closed |
| 8 | Categories | Includes `cyber_security`, lacks AI and Marketing | 8 PRD categories, defined in config, no cyber security |
| 9 | QC | 5 generic checklist keys | Category checklists, deliverable file required, originality report for writing |
| 10 | Revisions | No cap | 3 free, then a paid re-quote |
| 11 | Flags | Generic `flags` table, admin resolves | 3 per project, escalation chain, third flag opens a Support ticket |
| 12 | Quote expiry | Fixed 72 hours | Deadline minus delivery duration; none without a deadline |
| 13 | Auto-approve | 7 days | 14 days of silence releases the payout; the client side stays unapproved |
| 14 | Payouts | Admin `release_payout`; supervisor commission per project | QQD executes per doer with cumulative FY TDS, 10% reserve, retry queue. Supervisors are salaried in the PRD |
| 15 | Refunds | Admin, full only | Support recommends, QQD executes, partial allowed, liability decision per project |
| 16 | Tickets | Subject and category only | `SUP-000123` reference, priority, SLA, owner, internal notes, resolution, refund recommendation |
| 17 | Client identity | Supervisor sees only a uuid | Staff need display name, segment, country and currency |
| 18 | Capacity | None | Supervisor load and on-duty state for assignment |
| 19 | Verification | Admin KYC | QQD document check, then a supervisor identity call |
| 20 | Training | Claim is blocked until lessons are done | Never a platform gate; optional per-project requirement only |
| 21 | Notifications | No event for paid, doer accepted, submitted | Add those three; fix the `late_delivery` link |

## Coordination with the other pillars

- **Dolancer** shows the supervisor as a role. The portal sends the supervisor's first name only to doers (PRD 10.5).
- **Client app** must show the supervisor and QQD as "Coordinator" and each doer as "[Discipline] Expert". The current client redesign shows a named supervisor with a photo and email; that conflicts with PRD 4.3 and needs a product decision.
- **Client app** models projects as multi-milestone with per-milestone payment. The PRD and this portal use one fixed quote paid in full. Decide before wiring payments.
