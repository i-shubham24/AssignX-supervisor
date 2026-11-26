# Supabase Middleware Layer (`AssignX Supervisor`)

This folder contains the unified database migration and Edge Functions connecting **AssignX** (Client), **AssignX Supervisor** (`qqd`, `supervisor`, `support`), and **Dolancer** (`doer`) on top of the `assign-x` PostgreSQL schema.

## Included Components

- [0171_supervisor_portal_middleware.sql](file:///d:/AssignX%20Supervisor/supabase/migrations/0171_supervisor_portal_middleware.sql)
  - Extends `user_role` and `profiles` (`qqd`, `support`, categories, duty state, PAN hash, conduct flags) and stamps `assignx_role` + `segment` in `custom_access_token_hook`.
  - Adds `project_doers`, `workspace_logins` (`expert-01..50`), `doer_ratings`, `doer_conduct_log`, `refund_requests`, `portal_idempotency`, `portal_config`, and `portal_operator_preferences`.
  - Enforces `3`-project active cap and removes mandatory platform training blocker in `claim_project_as_doer` (`BR-021`, `BR-022`).
  - Locks `set_working_doc` to `aal2` Supervisors/QQD (`BR-018`) and updates `rating_level()` to `L1 / L2 / L3` (`>= 10 / 30` at `4.0`).
  - Adds message moderation (`state`, `held_reason`, `screen_note`), revokes direct client `INSERT` on `public.messages` (`BR-015`), and routes writes via `submit_screened_message`.
  - Delivers Dolancer's missing `payout_methods_doer`, `payouts_doer`, and `set_primary_payout_method` contracts + restores `security_barrier` on `projects_doer`.
- [portal-api](file:///d:/AssignX%20Supervisor/supabase/functions/portal-api/index.ts): Full REST router matching `/api/portal/*` with `aal2`, segment gating, BOLA scoping (`404`), idempotency keys, Section 194J TDS, and signed attachment URLs.
- [screen-message](file:///d:/AssignX%20Supervisor/supabase/functions/screen-message/index.ts): Fail-closed LLM chat screening gateway (`Claude Haiku < 800ms`) bypassing screening only for Supervisor/QQD/Support staff (`BR-014`, `BR-015`).
- [check-payout-account](file:///d:/AssignX%20Supervisor/supabase/functions/check-payout-account/index.ts) & [send-payout-code](file:///d:/AssignX%20Supervisor/supabase/functions/send-payout-code/index.ts): Closes Dolancer payout holder validation and verified-email OTP code security (`BACKEND-HANDOFF` §§6 & 7.1).
- [cron-middleware](file:///d:/AssignX%20Supervisor/supabase/functions/cron-middleware/index.ts): Handles `2h` offer expiry, `24h` quote auto-cancel, `14d` silent payout release markers, stalled queue broadcasts, and `30d` KYC raw PAN document purge (`BR-024`).

## Required Edge Function Secrets

Configure in Supabase Dashboard / CLI (never place secret keys inside frontend env files):

- `SUPABASE_URL` & privileged Supabase backend key (`SUPABASE_<BACKEND>_KEY`)
- `ANTHROPIC_API_KEY` (and optional `ANTHROPIC_SCREEN_MODEL`)
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAYX_ACCOUNT_NUMBER`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `CRON_WORKER_SECRET` (for `cron-middleware` `x-worker-secret` header)

## Frontend Live Mode Configuration

In `.env.live` or deployment environment variables:

```env
VITE_DEMO_MODE=false
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

When `VITE_API_BASE_URL` is left unset, [client.ts](file:///d:/AssignX%20Supervisor/src/api/client.ts) automatically routes `/api/portal/*` requests to `${VITE_SUPABASE_URL}/functions/v1/portal-api/api/portal/*`.
