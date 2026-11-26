-- Migration 0171: Supervisor Portal Middleware & AssignX / Dolancer Reconciliation
--
-- Target schema: assign-x Supabase PostgreSQL (migrations 0001..0170)
-- Resolves schema divergences documented in:
--   - AssignX Supervisor/docs/BACKEND-CONTRACT.md (Gaps 1..21)
--   - Dolancer/docs/BACKEND-HANDOFF.md (Sections 1..7 & Smaller notes)
--
-- Safe & idempotent: uses IF NOT EXISTS / CREATE OR REPLACE where supported so it can
-- apply cleanly on top of 0170 without breaking existing AssignX Client or Dolancer reads.

-- ---------------------------------------------------------------------------
-- 1. Staff Roles, Segments, Conduct Standing & JWT Claim Hook (Gaps 1, 18, 7.4)
-- ---------------------------------------------------------------------------

do $$
begin
  alter type public.user_role add value if not exists 'qqd';
  alter type public.user_role add value if not exists 'support';
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists portal_segment text check (portal_segment in ('qqd', 'supervisor', 'support')),
  add column if not exists categories text[] not null default '{}',
  add column if not exists on_duty boolean not null default true,
  add column if not exists is_lead boolean not null default false,
  add column if not exists full_name text,
  add column if not exists whatsapp text,
  add column if not exists available boolean not null default true,
  add column if not exists pan_hash text,
  add column if not exists warning_count integer not null default 0,
  add column if not exists suspended_until timestamptz,
  add column if not exists review_flagged boolean not null default false;

create index if not exists profiles_portal_segment_idx
  on public.profiles (portal_segment) where portal_segment is not null;
create unique index if not exists profiles_pan_hash_uniq
  on public.profiles (pan_hash) where pan_hash is not null;

-- Prevent self-service mutation of privileged profile fields & KYC-locked name (HANDOFF §7.4).
create or replace function public.enforce_profile_write_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_verified boolean := false;
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.portal_segment is distinct from old.portal_segment
     or new.is_lead is distinct from old.is_lead
     or new.categories is distinct from old.categories
     or new.pan_hash is distinct from old.pan_hash
     or new.warning_count is distinct from old.warning_count
     or new.suspended_until is distinct from old.suspended_until
     or new.review_flagged is distinct from old.review_flagged then
    raise exception 'restricted profile columns cannot be modified by client session';
  end if;

  if new.full_name is distinct from old.full_name then
    select exists(select 1 from public.kyc k where k.doer_id = old.id and k.status = 'approved')
      into v_verified;
    if v_verified then
      raise exception 'verified legal name is locked after KYC approval';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_write_guard on public.profiles;
create trigger profiles_write_guard
  before update on public.profiles
  for each row execute function public.enforce_profile_write_guard();

-- Emit assignx_role, segment, and staff onboarding flags inside Supabase JWT claims.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
set search_path = public
as $$
declare
  claims jsonb;
  v_role public.user_role;
  v_segment text;
  v_lead boolean;
  v_pending boolean;
  v_onboarded boolean;
begin
  select
    role,
    coalesce(portal_segment, case when role::text in ('qqd', 'supervisor', 'support') then role::text else null end),
    coalesce(is_lead, false),
    (deletion_scheduled_at is not null and purged_at is null),
    public.is_profile_onboarded(country, full_name)
    into v_role, v_segment, v_lead, v_pending, v_onboarded
    from public.profiles
    where id = (event ->> 'user_id')::uuid;

  claims := coalesce(event -> 'claims', '{}'::jsonb);
  if v_role is not null then
    claims := jsonb_set(claims, '{assignx_role}', to_jsonb(v_role::text));
  end if;
  if v_segment is not null then
    claims := jsonb_set(claims, '{segment}', to_jsonb(v_segment));
  end if;
  claims := jsonb_set(claims, '{is_lead}', to_jsonb(coalesce(v_lead, false)));
  claims := jsonb_set(claims, '{account_pending_deletion}', to_jsonb(coalesce(v_pending, false)));
  claims := jsonb_set(claims, '{onboarding_complete}', to_jsonb(coalesce(v_onboarded, false)));
  return jsonb_set(event, '{claims}', claims);
end;
$$;

grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

create or replace function public.portal_segment()
returns text
language sql
stable
as $$
  select coalesce(
    auth.jwt() ->> 'segment',
    auth.jwt() -> 'app_metadata' ->> 'segment',
    case
      when (auth.jwt() ->> 'assignx_role') in ('qqd', 'supervisor', 'support')
        then (auth.jwt() ->> 'assignx_role')
      when (auth.jwt() ->> 'assignx_role') = 'admin'
        then 'qqd'
      else null
    end
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Portal Config, Projects Extensions, Multi-Doer Pool & Workspaces
-- ---------------------------------------------------------------------------

create table if not exists public.portal_config (
  id integer primary key default 1 check (id = 1),
  doer_concurrency_cap integer not null default 3 check (doer_concurrency_cap between 1 and 10),
  open_pool_after_failed_offers integer not null default 2 check (open_pool_after_failed_offers between 1 and 10),
  free_revisions integer not null default 3 check (free_revisions between 0 and 10),
  offer_expiry_minutes integer not null default 120,
  silent_release_days integer not null default 14,
  updated_at timestamptz not null default now()
);
insert into public.portal_config (id) values (1) on conflict (id) do nothing;
alter table public.portal_config enable row level security;
alter table public.portal_config force row level security;

alter table public.projects
  add column if not exists code text,
  add column if not exists title text,
  add column if not exists description text,
  add column if not exists urgency text not null default 'standard' check (urgency in ('standard', 'express', 'urgent')),
  add column if not exists deadline_utc timestamptz,
  add column if not exists quote_currency text not null default 'INR',
  add column if not exists quote_amount_inr bigint,
  add column if not exists quote_note text,
  add column if not exists delivery_duration_hours integer,
  add column if not exists quote_expires_at timestamptz,
  add column if not exists quote_sent_at timestamptz,
  add column if not exists credits_applied_inr bigint not null default 0,
  add column if not exists expected_doer_cost_inr bigint,
  add column if not exists qqd_id uuid references public.profiles (id) on delete set null,
  add column if not exists supervisor_assigned_at timestamptz,
  add column if not exists progress_label text,
  add column if not exists progress_updated_at timestamptz,
  add column if not exists flag_count integer not null default 0,
  add column if not exists paid_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists approved_at timestamptz,
  add column if not exists payout_released_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists failed_offer_count integer not null default 0,
  add column if not exists in_open_pool boolean not null default false,
  add column if not exists self_assigned boolean not null default false,
  add column if not exists qc_data jsonb,
  add column if not exists delivery_note text,
  add column if not exists doer_brief text,
  add column if not exists client_rating integer check (client_rating between 1 and 5),
  add column if not exists client_review_note text,
  add column if not exists paid_revision_pending boolean not null default false,
  add column if not exists invoice_number text,
  add column if not exists razorpay_payment_id text;

-- Ensure project code auto-populates in AX-XXXXXX format if absent.
create sequence if not exists public.project_code_seq start with 1300;
create or replace function public.assign_project_code()
returns trigger
language plpgsql
as $$
begin
  if new.code is null then
    new.code := 'AX-' || lpad(nextval('public.project_code_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists projects_assign_code on public.projects;
create trigger projects_assign_code
  before insert on public.projects
  for each row execute function public.assign_project_code();

-- Workspace identity pool (expert-01..50@workspace.assignx.in).
create table if not exists public.workspace_logins (
  login text primary key,
  active_project_doer_id uuid,
  allocated_at timestamptz,
  created_at timestamptz not null default now()
);

insert into public.workspace_logins (login)
select 'expert-' || lpad(gs::text, 2, '0') || '@workspace.assignx.in'
from generate_series(1, 50) as gs
on conflict (login) do nothing;

alter table public.workspace_logins enable row level security;
alter table public.workspace_logins force row level security;

-- Multi-doer join table (Gaps 4 & 5).
create table if not exists public.project_doers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  doer_id uuid not null references public.profiles (id) on delete restrict,
  doer_code text not null,
  discipline text not null,
  payout_amount_inr bigint not null check (payout_amount_inr > 0),
  scope_note text,
  working_link text,
  offered_at timestamptz not null default now(),
  offer_expires_at timestamptz not null default (now() + interval '2 hours'),
  accepted_at timestamptz,
  status text not null default 'offered' check (status in ('offered', 'accepted', 'declined', 'expired', 'removed', 'completed')),
  decline_reason text,
  liability_decision text check (liability_decision in ('not_at_fault', 'partial', 'at_fault')),
  partial_payout_inr bigint,
  payout_status text not null default 'pending' check (payout_status in ('pending', 'released', 'withheld', 'failed')),
  required_module_id uuid,
  workspace_identity text references public.workspace_logins (login),
  created_at timestamptz not null default now()
);

create index if not exists project_doers_project_idx on public.project_doers (project_id);
create index if not exists project_doers_doer_idx on public.project_doers (doer_id, status);
create unique index if not exists project_doers_active_part_uniq
  on public.project_doers (project_id, discipline)
  where status in ('offered', 'accepted', 'completed');

alter table public.project_doers enable row level security;
alter table public.project_doers force row level security;

create policy project_doers_doer_select on public.project_doers
  for select to authenticated
  using (doer_id = (select auth.uid()));

create policy project_doers_staff_select on public.project_doers
  for select to authenticated
  using (
    public.is_aal2()
    and (
      public.portal_segment() in ('qqd', 'support')
      or (
        public.portal_segment() = 'supervisor'
        and exists (
          select 1 from public.projects p
          where p.id = project_doers.project_id and p.supervisor_id = (select auth.uid())
        )
      )
    )
  );

-- Doer post-completion ratings (PRD 10.10) & conduct enforcement log (PRD 10.6, 12.3).
create table if not exists public.doer_ratings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  project_doer_id uuid not null references public.project_doers (id) on delete cascade,
  doer_id uuid not null references public.profiles (id) on delete cascade,
  quality smallint not null check (quality between 1 and 5),
  timeliness smallint not null check (timeliness between 1 and 5),
  communication smallint not null check (communication between 1 and 5),
  notes text not null default '',
  rated_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (project_doer_id)
);

create table if not exists public.doer_conduct_log (
  id uuid primary key default gen_random_uuid(),
  doer_id uuid not null references public.profiles (id) on delete cascade,
  action text not null check (action in ('review_cleared', 'warning', 'suspended', 'demoted', 'promoted', 'removed', 'restored')),
  reason text not null,
  actor_id uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  ticket_reference text not null,
  project_id uuid not null references public.projects (id) on delete cascade,
  kind text not null check (kind in ('full', 'partial')),
  amount bigint not null check (amount > 0),
  currency text not null default 'INR',
  recommended_by uuid not null references public.profiles (id) on delete restrict,
  recommendation text not null,
  liability_decision text check (liability_decision in ('not_at_fault', 'partial', 'at_fault', 'company_process')),
  liability_reason text,
  liability_decided_by uuid references public.profiles (id),
  gateway_fee_inr bigint not null default 0,
  credits_restored_inr bigint not null default 0,
  approved_at timestamptz not null default now(),
  status text not null default 'awaiting_execution' check (status in ('awaiting_execution', 'executed', 'failed')),
  executed_by uuid references public.profiles (id),
  executed_at timestamptz
);

create table if not exists public.portal_idempotency (
  key text not null,
  endpoint text not null,
  actor_id uuid not null,
  status_code integer not null,
  response_body jsonb not null,
  created_at timestamptz not null default now(),
  primary key (key, endpoint)
);

create table if not exists public.portal_operator_preferences (
  operator_id uuid primary key references public.profiles (id) on delete cascade,
  notify_in_app boolean not null default true,
  notify_email boolean not null default true,
  notify_whatsapp boolean not null default false,
  notify_push boolean not null default true,
  quiet_from text,
  quiet_to text,
  urgent_breaks_quiet boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.doer_ratings enable row level security;
alter table public.doer_ratings force row level security;
alter table public.doer_conduct_log enable row level security;
alter table public.doer_conduct_log force row level security;
alter table public.refund_requests enable row level security;
alter table public.refund_requests force row level security;
alter table public.portal_idempotency enable row level security;
alter table public.portal_idempotency force row level security;
alter table public.portal_operator_preferences enable row level security;
alter table public.portal_operator_preferences force row level security;

-- ---------------------------------------------------------------------------
-- 3. Chat Moderation, Held State & Brief Attachment Redaction (Gap 7 & BR-015)
-- ---------------------------------------------------------------------------

do $$
begin
  alter type public.thread_kind add value if not exists 'invite';
exception
  when duplicate_object then null;
end $$;

alter table public.messages
  add column if not exists state text not null default 'delivered' check (state in ('delivered', 'held', 'approved', 'removed')),
  add column if not exists held_reason text check (held_reason in ('contact_details', 'identity_reveal')),
  add column if not exists screen_note text,
  add column if not exists moderated_by uuid references public.profiles (id),
  add column if not exists moderated_at timestamptz;

create index if not exists messages_held_idx on public.messages (state, created_at) where state = 'held';

-- Recipients never read 'held' or 'removed' rows; staff (aal2) read all rows (FR-CH-012).
drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated
  using (
    public.can_read_thread_by_id(thread_id)
    and (
      state in ('delivered', 'approved')
      or (
        public.is_aal2()
        and public.portal_segment() in ('supervisor', 'qqd', 'support')
      )
      or (auth.jwt() ->> 'assignx_role') = 'admin'
    )
  );

-- Close direct client INSERT on messages so every message traverses AI screening (BR-015).
revoke insert on public.messages from anon, authenticated;
drop policy if exists messages_insert on public.messages;

-- Server-only insert helper called exclusively by screen-message & portal-api Edge Functions.
create or replace function public.submit_screened_message(
  p_thread uuid,
  p_author uuid,
  p_body text,
  p_state text default 'delivered',
  p_held_reason text default null,
  p_screen_note text default null
)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.messages;
begin
  if (auth.jwt() ->> 'role') is distinct from 'service_role'
     and current_user not in ('service_role', 'postgres', 'supabase_admin') then
    raise exception 'screened message insert requires edge function service execution';
  end if;
  insert into public.messages (thread_id, author_id, body, state, held_reason, screen_note)
  values (p_thread, p_author, p_body, p_state, p_held_reason, p_screen_note)
  returning * into v_row;
  return v_row;
end;
$$;

revoke all on function public.submit_screened_message(uuid, uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_screened_message(uuid, uuid, text, text, text, text) to service_role;

-- Allow brief attachments to be explicitly toggled for doer visibility (PRD 10.1).
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'submission_attachments') then
    execute 'alter table public.submission_attachments add column if not exists doer_visible boolean not null default false';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Dolancer Contract Fixes (BACKEND-HANDOFF §§1..7, Working Link, Levels)
-- ---------------------------------------------------------------------------

-- 4a. PRD 10.6 Level Ladder: L1 base, L2 at 10 projects + 4.0, L3 at 30 projects + 4.0.
create or replace function public.rating_level(p_avg numeric, p_count bigint)
returns text
language sql
immutable
as $$
  select case
    when p_avg >= 4.0 and p_count >= 30 then 'L3'
    when p_avg >= 4.0 and p_count >= 10 then 'L2'
    else 'L1'
  end;
$$;

-- 4b. Restore security_barrier on projects_doer & read from project_doers/projects cleanly.
create or replace view public.projects_doer with (security_barrier = true) as
  select p.id, p.category, p.status, p.created_at, p.updated_at,
    coalesce(pd.working_link, p.working_doc_url) as working_doc_url,
    p.progress_pct, p.supervisor_id, p.qc_bounce_count, p.last_bounce_reason,
    coalesce(pd.payout_amount_inr, q.doer_payout_paise) as doer_payout_paise,
    coalesce(p.doer_brief, q.doer_brief) as doer_brief,
    q.delivery_at,
    p.user_revision_reason, p.user_revision_count
  from public.projects p
  left join public.project_doers pd
    on pd.project_id = p.id
   and pd.doer_id = (select auth.uid())
   and pd.status in ('accepted', 'completed')
  left join lateral (
    select quotes.doer_payout_paise, quotes.doer_brief, quotes.delivery_at
    from public.quotes where quotes.project_id = p.id order by quotes.created_at desc limit 1
  ) q on true
  where p.doer_id = (select auth.uid()) or pd.id is not null;

-- 4c. Claim RPC: enforce 3-project cap (BR-021), lift mandatory training gate (BR-022),
-- and enforce offer-first gating unless in_open_pool = true (FR-SV-008).
create or replace function public.claim_project_as_doer(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_kyc public.kyc_status;
  v_cap integer;
  v_active integer;
  v_offer_id uuid;
  v_affected integer;
begin
  if (auth.jwt() ->> 'assignx_role') is distinct from 'doer' then
    return false;
  end if;
  if public.is_suspended(v_uid) then
    raise exception 'account is suspended';
  end if;

  select status into v_kyc from public.kyc where doer_id = v_uid;
  if v_kyc is distinct from 'approved' then
    raise exception 'doer KYC is not approved';
  end if;

  select doer_concurrency_cap into v_cap from public.portal_config where id = 1;
  v_cap := coalesce(v_cap, 3);

  select count(*) into v_active
    from public.projects p
    where (
      p.doer_id = v_uid
      or exists (
        select 1 from public.project_doers pd
        where pd.project_id = p.id and pd.doer_id = v_uid and pd.status = 'accepted'
      )
    )
    and p.status in ('claimed', 'quoted', 'paid', 'in_progress', 'in_review', 'delivered');

  if v_active >= v_cap then
    raise exception 'concurrency cap reached';
  end if;

  -- Check direct offer first.
  select id into v_offer_id
    from public.project_doers
    where project_id = p_id
      and doer_id = v_uid
      and status = 'offered'
      and offer_expires_at > now()
    for update;

  if v_offer_id is not null then
    update public.project_doers
      set status = 'accepted', accepted_at = now()
      where id = v_offer_id;
    update public.projects
      set doer_id = coalesce(doer_id, v_uid), updated_at = now()
      where id = p_id;
    return true;
  end if;

  -- Open pool fallback: only when project has entered in_open_pool after failed offers.
  update public.projects
    set doer_id = v_uid, in_open_pool = false, updated_at = now()
    where id = p_id
      and doer_id is null
      and status in ('paid', 'in_progress')
      and in_open_pool = true
      and exists (
        select 1 from public.doer_skills ds
        join public.skills s on s.id = ds.skill_id
        where ds.doer_id = v_uid and s.category = public.projects.category
      );

  get diagnostics v_affected = row_count;
  return v_affected > 0;
end;
$$;

revoke all on function public.claim_project_as_doer(uuid) from public, anon;
grant execute on function public.claim_project_as_doer(uuid) to authenticated;

-- Doer accept/decline offer RPC for Dolancer.
create or replace function public.respond_to_doer_offer(p_offer_id uuid, p_accept boolean, p_reason text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_row public.project_doers;
begin
  select * into v_row
    from public.project_doers
    where id = p_offer_id and doer_id = v_uid and status = 'offered'
    for update;
  if v_row.id is null or v_row.offer_expires_at <= now() then
    return false;
  end if;

  if p_accept then
    return public.claim_project_as_doer(v_row.project_id);
  else
    update public.project_doers
      set status = 'declined', decline_reason = nullif(btrim(p_reason), '')
      where id = v_row.id;
    update public.projects
      set failed_offer_count = failed_offer_count + 1, updated_at = now()
      where id = v_row.project_id;
    return true;
  end if;
end;
$$;

revoke all on function public.respond_to_doer_offer(uuid, boolean, text) from public, anon;
grant execute on function public.respond_to_doer_offer(uuid, boolean, text) to authenticated;

-- 4d. Working Link Lockdown: Supervisor/QQD-only (BR-018 / FR-SV-007).
create or replace function public.set_working_doc(p_id uuid, p_url text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
  v_url text := nullif(btrim(p_url), '');
  v_seg text := public.portal_segment();
begin
  if v_seg not in ('supervisor', 'qqd') or not public.is_aal2() then
    raise exception 'only an authenticated supervisor with 2FA may set company working links';
  end if;
  if v_url is not null and (v_url !~ '^https://' or length(v_url) > 2048) then
    raise exception 'working doc link must be an https URL under 2048 characters';
  end if;

  update public.projects
    set working_doc_url = v_url, updated_at = now()
    where id = p_id
      and (v_seg = 'qqd' or supervisor_id = (select auth.uid()))
      and status in ('paid', 'in_progress', 'in_review');
  get diagnostics n = row_count;

  if n > 0 then
    update public.project_doers
      set working_link = v_url
      where project_id = p_id and status in ('accepted', 'completed');
  end if;
  return n > 0;
end;
$$;

revoke all on function public.set_working_doc(uuid, text) from public, anon;
grant execute on function public.set_working_doc(uuid, text) to authenticated;

-- 4e. Dolancer Payout Methods & Payouts Views (BACKEND-HANDOFF §§2 & 6).
alter table public.payout_methods
  add column if not exists holder_name text,
  add column if not exists bank_name text,
  add column if not exists is_primary boolean not null default false,
  add column if not exists active_from timestamptz;

alter table public.razorpay_payouts
  add column if not exists utr text,
  add column if not exists method_type text check (method_type in ('upi', 'bank')),
  add column if not exists method_display text,
  add column if not exists approved_at timestamptz;

create or replace view public.payout_methods_doer with (security_barrier = true) as
  select
    pm.id,
    pm.method_type,
    pm.vpa_masked,
    coalesce(pm.bank_name, case when pm.ifsc is not null then left(pm.ifsc, 4) else null end) as bank_name,
    pm.account_last4,
    coalesce(pm.holder_name, '') as holder_name,
    pm.is_primary,
    pm.active_from
  from public.payout_methods pm
  where pm.beneficiary_id = (select auth.uid());

grant select on public.payout_methods_doer to authenticated;

create or replace view public.payouts_doer with (security_barrier = true) as
  select
    rp.id,
    rp.project_id,
    rp.amount_paise,
    rp.status,
    coalesce(rp.method_type, 'bank') as method_type,
    coalesce(rp.method_display, rp.fund_account_id) as method_display,
    rp.utr,
    coalesce(rp.approved_at, rp.created_at) as approved_at,
    rp.status_event_at
  from public.razorpay_payouts rp
  where rp.beneficiary_id = (select auth.uid());

grant select on public.payouts_doer to authenticated;

create or replace function public.set_primary_payout_method(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if not public.is_aal2() then
    raise exception 'two-factor authentication required';
  end if;
  if not exists (select 1 from public.payout_methods where id = p_id and beneficiary_id = v_uid) then
    raise exception 'payout method not found';
  end if;
  update public.payout_methods set is_primary = false where beneficiary_id = v_uid;
  update public.payout_methods set is_primary = true where id = p_id and beneficiary_id = v_uid;
end;
$$;

revoke all on function public.set_primary_payout_method(uuid) from public, anon;
grant execute on function public.set_primary_payout_method(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Realtime Broadcast Authorization Policies (thread/project/notifications/queues)
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'realtime' and table_name = 'messages') then
    execute $pol$
      drop policy if exists realtime_portal_queues_select on realtime.messages;
      create policy realtime_portal_queues_select on realtime.messages
        for select to authenticated
        using (
          public.is_aal2()
          and (
            (topic in ('queue:moderation', 'queue:stalled', 'queue:disbursements') and public.portal_segment() in ('qqd', 'supervisor', 'support'))
            or (topic like 'notifications:%' and topic = 'notifications:' || (select auth.uid())::text)
          )
        );
    $pol$;
  end if;
exception
  when insufficient_privilege then null;
end $$;
