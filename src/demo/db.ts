/**
 * The demo backend.
 *
 * An in-memory store seeded from ./seed, with every mutation written the way the
 * real endpoint must behave: same gates, same transitions, same side effects
 * (system messages, activity, notifications). Treat each function here as the
 * reference behaviour for the backend team; the PRD rule it enforces is cited.
 *
 * State lives for the page session only. A reload restores the seed.
 */
import * as seed from "./seed";
import type {
  ActivityEvent,
  Attachment,
  Channel,
  DisbursementItem,
  DisbursementLine,
  Flag,
  HeldItem,
  Message,
  Operator,
  Project,
  ProjectDoer,
  QcRecord,
  RefundRequest,
  Segment,
  Ticket,
  TicketEntry,
  TrainingModule,
  VerificationCase,
  SupervisorApplication,
  WorkspaceLogin,
  OperatorPreferences,
  TrainingQuestion,
} from "@/types/domain";
import type { Currency, Minor } from "@/lib/money";
import { formatInr, percentOf } from "@/lib/money";
import {
  CATEGORIES,
  DOER_CONCURRENCY_CAP,
  FREE_REVISIONS,
  MAX_FLAGS,
  LEVEL_CUT,
  MESSAGE_MAX,
  OPEN_POOL_AFTER_FAILED_OFFERS,
  QC_CHECKLISTS,
  QUOTE_NOTE_MAX,
  SLA,
  TDS_RATE_PERCENT,
  TDS_THRESHOLD_INR,
} from "@/lib/config";
import { HOUR } from "@/lib/datetime";
import { portalError } from "@/lib/user-error";
import { cleanText } from "@/lib/input-safety";
import { checkWorkspaceUrl } from "@/lib/safe-url";
import { effectivePayout, isWorkingDoer, projectMargin, reserveFor } from "@/lib/margin";

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const clone = <T>(value: T): T => structuredClone(value);

interface PayoutState {
  status: DisbursementLine["status"];
  failure_reason: string | null;
  executed_by: string | null;
  executed_at: string | null;
  provider_ref: string | null;
}

const state = {
  operators: clone(seed.operators),
  projects: clone(seed.projects),
  messages: clone(seed.messages),
  doers: clone(seed.doers),
  tickets: clone(seed.tickets),
  verification: clone(seed.verificationCases),
  refunds: clone(seed.refunds),
  training: clone(seed.trainingModules),
  applications: clone(seed.supervisorApplications),
  /** Size of the anonymous workspace login pool. QQD can grow it. */
  poolSize: 50,
  rateBands: clone(seed.rateBands),
  ledger: clone(seed.ledger),
  activity: clone(seed.activity),
  notifications: clone(seed.notifications),
  payouts: new Map<string, PayoutState>(),
  /** Cumulative FY payouts per doer, for TDS (BR-025). */
  fyPaid: new Map<string, Minor>(seed.doers.map((d, i) => [d.id, ((i * 7_919) % 9) * 4_000_00])),
};

// The failed transfer on AX-001219, so the retry queue has something in it.
for (const p of state.projects) {
  for (const pd of p.doers) {
    if (pd.payout_status === "failed") {
      state.payouts.set(pd.id, { status: "failed", failure_reason: "Beneficiary name does not match the name on the PAN", executed_by: "Meera Krishnan", executed_at: seed.ago(5 * HOUR), provider_ref: "pout_demo_FAIL1" });
    }
    if (pd.payout_status === "released") {
      state.payouts.set(pd.id, { status: "paid", failure_reason: null, executed_by: "Arjun Rao", executed_at: seed.ago(7 * 24 * HOUR), provider_ref: "pout_demo_4H2" });
    }
  }
}

let seq = 1000;
const nextId = (prefix: string) => `${prefix}-${++seq}`;
const nowIso = () => new Date().toISOString();

// Seeded doers who already work on live projects get a workspace login.
queueMicrotask(() => {
  for (const p of state.projects) {
    if (p.status === "completed" || p.status === "cancelled") continue;
    for (const pd of p.doers) if (isWorkingDoer(pd) && !pd.workspace_identity) pd.workspace_identity = allocateIdentity();
  }
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function operator(id: string | null | undefined): Operator | undefined {
  return id ? state.operators.find((o) => o.id === id) : undefined;
}

function opName(id: string): string {
  return operator(id)?.full_name ?? "Operator";
}

function mustProject(id: string): Project {
  const p = state.projects.find((x) => x.id === id);
  if (!p) throw portalError("That project no longer exists.");
  return p;
}

function touch(p: Project) {
  p.updated_at = nowIso();
}

/**
 * Object-level authorization (the BOLA fix). Every write checks that the actor owns
 * the object, not just that they hold a role. The real backend must do the same in
 * RLS or the endpoint, and answer 404 rather than 403 for objects outside scope.
 */
/** Supervisors see their own projects; QQD and Support see all (PRD 4.1). */
function visibleTo(p: Project, actorId: string): boolean {
  const op = operator(actorId);
  if (!op) return false;
  return op.segment !== "supervisor" || p.supervisor_id === actorId;
}

/** Role check mirroring the PRD 4.2 permission matrix. */
function assertSegment(actorId: string, ...allowed: Segment[]) {
  const op = operator(actorId);
  if (!op || !allowed.includes(op.segment)) throw portalError("Your role can't do that.");
  return op;
}

/** Anonymous workspace logins, expert-01 to expert-50, one per doer per project. */
function allocateIdentity(): string {
  const used = new Set(
    state.projects
      .filter((p) => p.status !== "completed" && p.status !== "cancelled")
      .flatMap((p) => p.doers.filter(isWorkingDoer).map((d) => d.workspace_identity))
      .filter(Boolean),
  );
  for (let i = 1; i <= state.poolSize; i++) {
    const id = `expert-${String(i).padStart(2, "0")}@workspace.assignx.in`;
    if (!used.has(id)) return id;
  }
  throw portalError("Every workspace login is in use. Ask QQD to add more.");
}

function assertSupervisorOwns(p: Project, actorId: string) {
  const op = operator(actorId);
  if (op?.segment !== "supervisor" || p.supervisor_id !== actorId) throw portalError("Only the assigned supervisor can do this.");
}

function assertCanModerate(p: Project, actorId: string) {
  const op = operator(actorId);
  if (!op) throw portalError("Sign in again.");
  // FR-SV-009: supervisors on their own projects; Support and QQD on any.
  if (op.segment === "supervisor" && p.supervisor_id !== actorId) throw portalError("Only the assigned supervisor, Support or QQD can moderate this.");
}

function assertCanPost(p: Project, channel: Channel, actorId: string) {
  const op = operator(actorId);
  if (!op) throw portalError("Sign in again.");
  if (op.segment === "supervisor" && p.supervisor_id !== actorId) throw portalError("You are not the supervisor on this project.");
  if (op.segment === "qqd" && channel === "internal") throw portalError("QQD does not post in the internal doer channel.");
  if (op.segment === "qqd" && p.supervisor_id) throw portalError("The supervisor is the coordinator now. Message them instead.");
}

function log(kind: ActivityEvent["kind"], p: Project | null, text: string, actor: string) {
  state.activity.unshift({ id: nextId("ev"), project_id: p?.id ?? null, project_code: p?.code ?? null, kind, text, actor_label: actor, created_at: nowIso() });
}

function systemMessage(p: Project, body: string) {
  state.messages.push({
    id: nextId("m"), project_id: p.id, channel: "client", sender_role: "system", sender_label: "System", sender_id: null, discipline: null,
    body, state: "delivered", held_reason: null, screen_note: null, moderated_by: null, moderated_at: null, created_at: nowIso(), attachments: [],
  });
}

function notify(segment: Segment, title: string, body: string, href: string | null, tone: "info" | "warning" | "danger" | "success") {
  state.notifications[segment].unshift({ id: nextId("n"), title, body, href, tone, created_at: nowIso(), read_at: null });
}

function refreshHeldCounts() {
  for (const p of state.projects) p.held_count = state.messages.filter((m) => m.project_id === p.id && m.state === "held").length;
}
refreshHeldCounts();

function recountSupervisorLoad() {
  for (const op of state.operators) {
    if (op.segment !== "supervisor") continue;
    const own = state.projects.filter((p) => p.supervisor_id === op.id && (p.status === "in_progress" || p.status === "in_review")).length;
    const base = seed.operators.find((o) => o.id === op.id)?.active_project_count ?? 0;
    op.active_project_count = op.id === "op-kabir" ? own : base + own;
  }
}
recountSupervisorLoad();

/** PRD 6.8: an expired quote cancels itself 24 hours after expiry if nobody acts. */
function sweepQuotes() {
  const now = Date.now();
  for (const p of state.projects) {
    if (p.status !== "awaiting_payment" || !p.quote_expires_at) continue;
    if (now - new Date(p.quote_expires_at).getTime() < 24 * HOUR) continue;
    p.status = "cancelled";
    p.cancellation_reason = "quote_expired";
    p.cancelled_at = new Date().toISOString();
    systemMessage(p, "This task was cancelled");
    log("quoted", p, "Quote expired and the task was cancelled", "System");
  }
}

/** Pending offers that have passed their expiry are treated as expired (PRD 10.5). */
function sweepOffers() {
  const now = Date.now();
  for (const p of state.projects) {
    for (const pd of p.doers) {
      if (pd.status === "offered" && new Date(pd.offer_expires_at).getTime() < now) {
        pd.status = "expired";
        p.failed_offer_count += 1;
        log("offer_declined", p, `Offer to ${pd.doer_code} expired`, "System");
      }
    }
  }
}

export const isActiveDoer = (pd: ProjectDoer) => pd.status === "accepted" || pd.status === "completed";

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export const read = {
  operators: () => {
    recountSupervisorLoad();
    return clone(state.operators);
  },
  /** Supervisors only ever receive their own projects (PRD 4.1). */
  projects: (actorId: string) => {
    sweepOffers();
    sweepQuotes();
    refreshHeldCounts();
    return clone(state.projects.filter((p) => visibleTo(p, actorId)));
  },
  project: (id: string, actorId: string) => {
    sweepOffers();
    sweepQuotes();
    refreshHeldCounts();
    const p = mustProject(id);
    // Outside scope looks exactly like not found (NFR-013).
    if (!visibleTo(p, actorId)) throw portalError("That project no longer exists.");
    return clone(p);
  },
  messages: (projectId: string, channel: Channel) =>
    clone(
      state.messages
        .filter((m) => m.project_id === projectId && m.channel === channel)
        .sort((a, b) => a.created_at.localeCompare(b.created_at)),
    ),
  held: (): HeldItem[] => {
    const held = state.messages.filter((m) => m.state === "held").sort((a, b) => a.created_at.localeCompare(b.created_at));
    return clone(
      held.map((message) => {
        const p = mustProject(message.project_id);
        const thread = state.messages
          .filter((m) => m.project_id === p.id && m.channel === message.channel && m.created_at < message.created_at && m.state !== "removed")
          .sort((a, b) => a.created_at.localeCompare(b.created_at));
        return { message, project: { id: p.id, code: p.code, title: p.title, category: p.category, status: p.status }, context: thread.slice(-5) };
      }),
    );
  },
  doers: () => clone(state.doers),
  doer: (id: string) => {
    const d = state.doers.find((x) => x.id === id);
    if (!d) throw portalError("That doer was not found.");
    return clone(d);
  },
  doerProjects: (doerId: string, actorId: string) =>
    clone(state.projects.filter((p) => visibleTo(p, actorId) && p.doers.some((pd) => pd.doer_id === doerId && pd.status !== "declined" && pd.status !== "expired"))),
  tickets: () => clone(state.tickets),
  ticket: (id: string) => {
    const t = state.tickets.find((x) => x.id === id);
    if (!t) throw portalError("That ticket was not found.");
    return clone(t);
  },
  verification: () => clone(state.verification),
  refunds: () => clone(state.refunds),
  training: () => clone(state.training),
  trainingModule: (id: string) => {
    const m = state.training.find((x) => x.id === id);
    if (!m) throw portalError("That module was not found.");
    return clone(m);
  },
  applications: () => clone(state.applications),
  workspaceLogins: (): WorkspaceLogin[] => {
    const used = new Map<string, WorkspaceLogin["in_use"]>();
    for (const p of state.projects) {
      if (p.status === "completed" || p.status === "cancelled") continue;
      for (const d of p.doers) if (isWorkingDoer(d) && d.workspace_identity) used.set(d.workspace_identity, { project_id: p.id, project_code: p.code, doer_code: d.doer_code, since: d.accepted_at });
    }
    return Array.from({ length: state.poolSize }, (_, i) => {
      const login = `expert-${String(i + 1).padStart(2, "0")}@workspace.assignx.in`;
      return { login, in_use: used.get(login) ?? null };
    });
  },
  rateBands: () => clone(state.rateBands),
  ledger: () => clone(state.ledger),
  activity: () => clone(state.activity.slice(0, 60)),
  notifications: (segment: Segment) => clone(state.notifications[segment]),
  disbursements: (): DisbursementItem[] => {
    const items: DisbursementItem[] = [];
    for (const p of state.projects) {
      if (p.status !== "completed" && !(p.status === "delivered" && p.payout_released_at)) continue;
      const lines = p.doers.filter(isActiveDoer).map((pd) => line(pd));
      if (lines.every((l) => l.status === "paid" || l.status === "withheld") && p.payout_released_at && p.status === "completed" && p.approved_at && Date.now() - new Date(p.approved_at).getTime() > 2 * 24 * HOUR) continue;
      const margin = projectMargin(p) ?? 0;
      items.push({
        project: { id: p.id, code: p.code, title: p.title, category: p.category, quote_amount: p.quote_amount, quote_currency: p.quote_currency, quote_amount_inr: p.quote_amount_inr, credits_applied_inr: p.credits_applied_inr },
        trigger: p.status === "completed" ? "client_approved" : "silent_release",
        triggered_at: (p.status === "completed" ? p.approved_at : p.payout_released_at) ?? p.updated_at,
        lines,
        margin_inr: margin,
        reserve_inr: reserveFor(margin),
      });
    }
    return clone(items.sort((a, b) => a.triggered_at.localeCompare(b.triggered_at)));
  },
};

/** TDS on cumulative FY payments, not per transaction (BR-025, PRD 10.7). */
export function computeTds(fyBefore: Minor, gross: Minor): Minor {
  const after = fyBefore + gross;
  if (after <= TDS_THRESHOLD_INR) return 0;
  if (fyBefore > TDS_THRESHOLD_INR) return percentOf(gross, TDS_RATE_PERCENT);
  // Threshold crossed by this payment: deduct on the full cumulative amount, but
  // never more than this payment itself (any shortfall is carried by the backend).
  return Math.min(gross, percentOf(after, TDS_RATE_PERCENT));
}

function line(pd: ProjectDoer): DisbursementLine {
  const ps = state.payouts.get(pd.id);
  const fyBefore = state.fyPaid.get(pd.doer_id) ?? 0;
  // The supervisor's fault decision sets what is paid: full, partial or nothing.
  const gross = effectivePayout(pd);
  const tds = computeTds(fyBefore, gross);
  return {
    project_doer_id: pd.id,
    doer_code: pd.doer_code,
    discipline: pd.discipline,
    gross_inr: gross,
    fy_paid_before_inr: fyBefore,
    tds_inr: tds,
    net_inr: gross - tds,
    liability_decision: pd.liability_decision,
    status: ps?.status ?? (gross === 0 ? "withheld" : "queued"),
    failure_reason: ps?.failure_reason ?? null,
    executed_by: ps?.executed_by ?? null,
    executed_at: ps?.executed_at ?? null,
    provider_ref: ps?.provider_ref ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* QQD: quoting and assignment                                         */
/* ------------------------------------------------------------------ */

export interface QuoteInput {
  amount: Minor;
  currency: Currency;
  delivery_duration_hours: number;
  note: string;
  expected_doer_cost_inr: Minor;
}

/** Expiry is deadline minus duration; no deadline means no expiry (PRD 6.8). */
export function computeQuoteExpiry(deadlineUtc: string | null, durationHours: number): string | null {
  if (!deadlineUtc) return null;
  return new Date(new Date(deadlineUtc).getTime() - durationHours * HOUR).toISOString();
}

export function sendQuote(projectId: string, input: QuoteInput, actorId: string) {
  assertSegment(actorId, "qqd"); // FR-SV-002
  const p = mustProject(projectId);
  const updating = p.status === "awaiting_payment";
  if (p.status !== "awaiting_quote" && !updating) throw portalError("This project can't be quoted now.");
  if (input.amount <= 0) throw portalError("Enter a quote amount above zero.");
  if (input.currency !== p.client.currency) throw portalError(`Quotes for this client are in ${p.client.currency}.`);
  if (input.delivery_duration_hours <= 0) throw portalError("Enter a delivery duration.");
  if (input.note.length > QUOTE_NOTE_MAX) throw portalError(`Keep the coordinator note under ${QUOTE_NOTE_MAX} characters.`);
  const expiry = computeQuoteExpiry(p.deadline_utc, input.delivery_duration_hours);
  // FR-SV-005: block a quote whose expiry is already in the past.
  if (expiry && new Date(expiry).getTime() <= Date.now()) {
    throw portalError("The client's deadline cannot be met with this delivery duration. Shorten the duration or message the client first.");
  }
  const amountInr = Math.round(input.amount * seed.DEMO_FX_TO_INR[input.currency]);
  p.quote_amount = input.amount;
  p.quote_currency = input.currency;
  p.quote_amount_inr = amountInr;
  p.quote_note = input.note.trim() || null;
  p.delivery_duration_hours = input.delivery_duration_hours;
  p.quote_expires_at = expiry;
  p.quote_sent_at = nowIso();
  p.expected_doer_cost_inr = input.expected_doer_cost_inr;
  p.margin_inr = amountInr - input.expected_doer_cost_inr;
  p.qqd_id = actorId;
  p.status = "awaiting_payment";
  touch(p);
  systemMessage(p, updating ? "Your quote has been updated" : "A quote has been sent");
  log("quoted", p, `Quote sent: ${input.currency} ${(input.amount / 100).toLocaleString()}`, opName(actorId));
}

/** Demo only: stands in for the signature-verified payment.captured webhook (BR-006). */
export function simulatePayment(projectId: string) {
  const p = mustProject(projectId);
  if (p.status !== "awaiting_payment") throw portalError("Only a quoted project can be paid.");
  p.status = "in_progress";
  p.paid_at = nowIso();
  touch(p);
  systemMessage(p, "Payment confirmed");
  state.ledger.unshift({
    id: nextId("lg"), type: "payment_captured", project_code: p.code, amount: p.quote_amount ?? 0, currency: p.quote_currency, inr_equivalent: p.quote_amount_inr ?? 0,
    fx_rate: seed.DEMO_FX_TO_INR[p.quote_currency], actor: "Razorpay webhook", provider_ref: `pay_demo_${p.code.slice(-4)}`, created_at: nowIso(),
  });
  log("paid", p, "Payment captured, entered assignment queue", "Razorpay");
  notify("qqd", "Payment captured", `${p.code} is paid and needs a supervisor within 15 minutes.`, "/assignment", "info");
}

export function assignSupervisor(projectId: string, supervisorId: string, actorId: string) {
  assertSegment(actorId, "qqd");
  const p = mustProject(projectId);
  if (p.status !== "in_progress" || !p.paid_at) throw portalError("Only paid projects can be assigned.");
  if (p.supervisor_id) throw portalError("This project already has a supervisor.");
  const sup = operator(supervisorId);
  if (!sup || sup.segment !== "supervisor") throw portalError("Choose a supervisor.");
  p.supervisor_id = supervisorId;
  p.supervisor_assigned_at = nowIso();
  touch(p);
  recountSupervisorLoad();
  log("supervisor_assigned", p, `Assigned to ${sup.full_name}`, opName(actorId));
  if (supervisorId === seed.DEMO_IDENTITY.supervisor) {
    notify("supervisor", "New project assigned", `${p.code} ${p.title} was assigned to you.`, `/projects/${p.id}`, "info");
  }
}

/* ------------------------------------------------------------------ */
/* Supervisor: sourcing                                                */
/* ------------------------------------------------------------------ */

export interface OfferInput {
  doer_id: string;
  discipline: Project["category"];
  payout_amount_inr: Minor;
  scope_note: string;
  required_module_id: string | null;
  /** Second and later offers on a multi-doer project are independent parts. */
  as_additional_part: boolean;
}

export function sendOffer(projectId: string, input: OfferInput, actorId: string) {
  sweepOffers();
  const p = mustProject(projectId);
  if (p.status !== "in_progress" || !p.paid_at) throw portalError("Offers can only be sent on paid, in-progress projects.");
  if (p.supervisor_id !== actorId) throw portalError("Only the assigned supervisor can source this project.");
  const d = state.doers.find((x) => x.id === input.doer_id);
  if (!d) throw portalError("That doer was not found.");
  // BR-023: no offers until verified.
  if (d.verification_status !== "verified") throw portalError(`${d.doer_code} is not verified yet and cannot receive offers.`);
  if (d.status !== "active") throw portalError(`${d.doer_code} is suspended.`);
  // BR-021: concurrency cap. A multi-doer project holds one slot per doer.
  if (d.active_project_count >= DOER_CONCURRENCY_CAP) throw portalError(`${d.doer_code} already holds ${DOER_CONCURRENCY_CAP} active projects.`);
  if (p.doers.some((pd) => pd.doer_id === d.id && (pd.status === "offered" || isActiveDoer(pd)))) throw portalError(`${d.doer_code} is already on this project.`);
  // One open offer or one doer per part. A second doer is only for a different discipline.
  const samePart = p.doers.find((pd) => pd.discipline === input.discipline && (pd.status === "offered" || isActiveDoer(pd)));
  if (samePart) {
    throw portalError(samePart.status === "offered" ? "This part already has an open offer. Withdraw it or wait for it to expire." : "This part already has a doer.");
  }
  if (input.payout_amount_inr <= 0) throw portalError("Set a payout amount.");
  const now = Date.now();
  p.doers.push({
    id: nextId("pd"), project_id: p.id, doer_id: d.id, doer_code: d.doer_code, discipline: input.discipline, payout_amount_inr: input.payout_amount_inr,
    scope_note: input.scope_note.trim() || null, working_link: null, offered_at: new Date(now).toISOString(), offer_expires_at: new Date(now + SLA.offerExpiry).toISOString(),
    accepted_at: null, status: "offered", decline_reason: null, liability_decision: null, partial_payout_inr: null, payout_status: "pending",
    required_module_id: input.required_module_id, workspace_identity: null,
  });
  touch(p);
  log("offer_sent", p, `Offer sent to ${d.doer_code}: ${formatInr(input.payout_amount_inr)}`, opName(actorId));
}

export function withdrawOffer(projectDoerId: string, actorId: string) {
  const p = state.projects.find((x) => x.doers.some((pd) => pd.id === projectDoerId));
  const pd = p?.doers.find((x) => x.id === projectDoerId);
  if (!p || !pd) throw portalError("That offer was not found.");
  assertSupervisorOwns(p, actorId);
  if (pd.status !== "offered") throw portalError("Only an open offer can be withdrawn.");
  pd.status = "removed";
  touch(p);
  log("offer_declined", p, `Offer to ${pd.doer_code} withdrawn`, opName(actorId));
}

/** Demo only: plays the doer accepting or declining on Dolancer. */
export function simulateOfferResponse(projectDoerId: string, accept: boolean) {
  sweepOffers();
  const p = state.projects.find((x) => x.doers.some((pd) => pd.id === projectDoerId));
  const pd = p?.doers.find((x) => x.id === projectDoerId);
  if (!p || !pd) throw portalError("That offer was not found.");
  if (pd.status !== "offered" || new Date(pd.offer_expires_at).getTime() <= Date.now()) throw portalError("This offer is no longer open.");
  const d = state.doers.find((x) => x.id === pd.doer_id);
  if (accept) {
    if (d && d.active_project_count >= DOER_CONCURRENCY_CAP) throw portalError("The doer is at the three-project cap.");
    pd.status = "accepted";
    pd.accepted_at = nowIso();
    pd.workspace_identity = allocateIdentity();
    if (d) d.active_project_count += 1;
    // The client hears about the expert once the workspace exists (PRD 6.1 step 18).
    log("offer_accepted", p, `${pd.doer_code} accepted`, pd.doer_code);
    notify("supervisor", "Offer accepted", `${pd.doer_code} accepted ${p.code}. Set the working link so they can start.`, `/projects/${p.id}`, "success");
  } else {
    pd.status = "declined";
    pd.decline_reason = "Not available for this deadline";
    p.failed_offer_count += 1;
    log("offer_declined", p, `${pd.doer_code} declined`, pd.doer_code);
    notify("supervisor", "Offer declined", `${pd.doer_code} declined ${p.code}.`, `/projects/${p.id}`, "warning");
  }
  touch(p);
}

export function openToPool(projectId: string, actorId: string) {
  sweepOffers();
  const p = mustProject(projectId);
  if (p.supervisor_id !== actorId) throw portalError("Only the assigned supervisor can do this.");
  // FR-SV-008: fallback only, after two failed direct offers.
  if (p.failed_offer_count < OPEN_POOL_AFTER_FAILED_OFFERS) throw portalError(`The open pool unlocks after ${OPEN_POOL_AFTER_FAILED_OFFERS} failed direct offers.`);
  if (p.doers.some(isActiveDoer)) throw portalError("A doer is already working on this project.");
  p.in_open_pool = true;
  touch(p);
  log("offer_sent", p, "Opened to the Dolancer open pool", opName(actorId));
}

export function selfAssign(projectId: string, actorId: string) {
  const p = mustProject(projectId);
  if (p.supervisor_id !== actorId) throw portalError("Only the assigned supervisor can do this.");
  if (p.status !== "in_progress") throw portalError("Only work in progress can be taken on.");
  if (p.doers.some(isActiveDoer)) throw portalError("A doer is already working on this project.");
  if (p.doers.some((pd) => pd.status === "offered")) throw portalError("Withdraw the open offer first.");
  if (p.failed_offer_count < OPEN_POOL_AFTER_FAILED_OFFERS) throw portalError("Self-assignment is a last resort after direct offers have failed.");
  p.self_assigned = true;
  p.in_open_pool = false;
  touch(p);
  log("offer_accepted", p, "Supervisor took the work personally", opName(actorId));
}

/** FR-SV-007 and BR-018: the doer is blocked until a company workspace link exists. */
export function setWorkingLink(projectDoerId: string, url: string, actorId: string) {
  const p = state.projects.find((x) => x.doers.some((pd) => pd.id === projectDoerId));
  const pd = p?.doers.find((x) => x.id === projectDoerId);
  if (!p || !pd) throw portalError("That assignment was not found.");
  assertSupervisorOwns(p, actorId);
  if (!isActiveDoer(pd)) throw portalError("Set the working link after the doer accepts.");
  // https only, approved workspace hosts only: blocks javascript: hrefs and SSRF targets.
  const check = checkWorkspaceUrl(url);
  if (!check.ok) throw portalError(check.reason);
  const first = !pd.working_link;
  pd.working_link = check.url;
  touch(p);
  if (first) {
    const label = CATEGORIES[pd.discipline].expert.toLowerCase();
    const others = p.doers.filter((x) => x.id !== pd.id && isActiveDoer(x) && x.working_link).length;
    systemMessage(p, others ? `A ${label} has joined your project` : `A ${label} has been allotted to your project`);
  }
  log("working_link_set", p, `Working link set for ${pd.doer_code}`, opName(actorId));
  state.messages.push({
    id: nextId("m"), project_id: p.id, channel: "internal", sender_role: "coordinator", sender_label: opName(actorId), sender_id: actorId, discipline: null,
    body: "Your company workspace is ready. Open it from the project page; work only inside this workspace.", state: "delivered", held_reason: null, screen_note: null,
    moderated_by: null, moderated_at: null, created_at: nowIso(), attachments: [],
  });
}

/* ------------------------------------------------------------------ */
/* Supervisor: oversight                                               */
/* ------------------------------------------------------------------ */

export function updateProgress(projectId: string, percent: number, label: string, actorId: string) {
  const p = mustProject(projectId);
  assertSupervisorOwns(p, actorId);
  label = cleanText(label, 80);
  if (p.status !== "in_progress") throw portalError("Progress can only be updated while work is in progress.");
  if (!Number.isInteger(percent) || percent < 0 || percent > 100) throw portalError("Progress must be a whole number from 0 to 100.");
  if (!label.trim()) throw portalError("Add a short stage label the client will see.");
  p.progress_percent = percent;
  p.progress_label = label.trim().slice(0, 80);
  p.progress_updated_at = nowIso();
  touch(p);
  log("progress", p, `Progress ${percent}%: ${p.progress_label}`, opName(actorId));
}

export function postSnapshot(projectId: string, filename: string, note: string, actorId: string) {
  const p = mustProject(projectId);
  assertSupervisorOwns(p, actorId);
  note = cleanText(note, 500);
  if (p.status !== "in_progress" && p.status !== "in_review") throw portalError("Snapshots are posted while work is underway.");
  const att = seed.attachment("snapshot", filename, { note: note.trim(), created_at: nowIso(), scan_status: "clean" });
  p.attachments.push(att);
  state.messages.push({
    id: nextId("m"), project_id: p.id, channel: "client", sender_role: "coordinator", sender_label: opName(actorId), sender_id: actorId, discipline: null,
    body: note.trim() ? `Progress snapshot: ${note.trim()}` : "Progress snapshot", state: "delivered", held_reason: null, screen_note: null,
    moderated_by: null, moderated_at: null, created_at: nowIso(), attachments: [att],
  });
  touch(p);
  log("progress", p, "Snapshot posted to the client", opName(actorId));
}

/** Coordinator and Support messages are never screened (BR-014, FR-CH-003). */
export function sendMessage(projectId: string, channel: Channel, body: string, actorId: string, attachmentNames: string[] = []) {
  const p = mustProject(projectId);
  const text = cleanText(body, MESSAGE_MAX + 1).trim();
  if (!text && !attachmentNames.length) throw portalError("Write a message first.");
  if (text.length > MESSAGE_MAX) throw portalError(`Messages are limited to ${MESSAGE_MAX} characters.`);
  if (p.status === "completed" || p.status === "cancelled") throw portalError("This thread is read-only now.");
  const op = operator(actorId);
  if (channel === "internal" && op?.segment === "support") throw portalError("Support cannot post in the internal doer channel.");
  assertCanPost(p, channel, actorId);
  const message: Message = {
    id: nextId("m"), project_id: p.id, channel, sender_role: op?.segment === "support" ? "support" : "coordinator", sender_label: opName(actorId), sender_id: actorId,
    discipline: null, body: text, state: "delivered", held_reason: null, screen_note: null, moderated_by: null, moderated_at: null, created_at: nowIso(),
    attachments: attachmentNames.map((name) => seed.attachment("chat", name, { uploaded_by_role: "coordinator", created_at: nowIso(), client_visible: channel === "client" })),
  };
  state.messages.push(message);
  touch(p);
  return clone(message);
}

/* ------------------------------------------------------------------ */
/* Moderation (FR-SV-009, PRD 13.5)                                    */
/* ------------------------------------------------------------------ */

export function moderate(messageId: string, decision: "approve" | "remove", actorId: string) {
  const m = state.messages.find((x) => x.id === messageId);
  if (!m) throw portalError("That message was not found.");
  if (m.state !== "held") throw portalError("This message was already decided.");
  const p = mustProject(m.project_id);
  assertCanModerate(p, actorId);
  m.state = decision === "approve" ? "approved" : "removed";
  m.moderated_by = actorId;
  m.moderated_at = nowIso();
  refreshHeldCounts();
  log("moderated", p, `${decision === "approve" ? "Approved" : "Removed"} held message from ${m.sender_label}`, opName(actorId));
}

export function moderateBulk(messageIds: string[], decision: "approve" | "remove", actorId: string) {
  let count = 0;
  for (const id of messageIds) {
    try {
      moderate(id, decision, actorId);
      count++;
    } catch {
      // Continue for remaining messages in bulk action
    }
  }
  return { count, decision };
}

/* ------------------------------------------------------------------ */
/* QC and delivery (FR-SV-010)                                         */
/* ------------------------------------------------------------------ */

export function saveQc(projectId: string, qc: Omit<QcRecord, "completed_at">, actorId: string) {
  const p = mustProject(projectId);
  assertSupervisorOwns(p, actorId);
  if (p.status !== "in_review") throw portalError("QC is recorded while the project is in review.");
  const clean = { ...qc, notes: cleanText(qc.notes, 2000), custom_checks: qc.custom_checks.map((c) => ({ ...c, label: cleanText(c.label, 120) })) };
  p.qc = { ...clean, completed_at: qcComplete(p.category, clean) ? nowIso() : null };
  touch(p);
}

export function qcComplete(category: Project["category"], qc: Pick<QcRecord, "checks" | "custom_checks"> | null): boolean {
  if (!qc) return false;
  const items = QC_CHECKLISTS[category];
  if (category === "other") return qc.custom_checks.length > 0 && qc.custom_checks.every((c) => c.done);
  return items.every((item) => qc.checks[item.id]) && qc.custom_checks.every((c) => c.done);
}

export function addDeliverable(projectId: string, filename: string, kind: Attachment["kind"], actorId: string) {
  const p = mustProject(projectId);
  assertSupervisorOwns(p, actorId);
  if (p.status !== "in_review") throw portalError("Deliverables are uploaded during final checks.");
  // Uploads are scanned before they become available (NFR-016). The demo resolves instantly.
  p.attachments.push(seed.attachment(kind, filename, { created_at: nowIso(), client_visible: false, scan_status: "clean" }));
  touch(p);
}

export function removeAttachment(projectId: string, attachmentId: string, actorId: string) {
  const p = mustProject(projectId);
  assertSupervisorOwns(p, actorId);
  const att = p.attachments.find((a) => a.id === attachmentId);
  if (!att) return;
  if (att.kind !== "deliverable" && att.kind !== "quality_report") throw portalError("Only deliverables you uploaded can be removed.");
  if (p.status !== "in_review") throw portalError("Delivered files are locked.");
  p.attachments = p.attachments.filter((a) => a.id !== attachmentId);
  touch(p);
}

export function deliver(projectId: string, note: string, actorId: string) {
  const p = mustProject(projectId);
  if (p.supervisor_id !== actorId) throw portalError("Only the assigned supervisor can deliver.");
  if (p.status !== "in_review") throw portalError("Only work in final checks can be delivered.");
  if (!qcComplete(p.category, p.qc)) throw portalError("Complete every QC check before delivering.");
  if (!p.attachments.some((a) => a.kind === "deliverable")) throw portalError("Upload at least one deliverable file.");
  if (p.category === "writing" && !p.attachments.some((a) => a.kind === "quality_report")) throw portalError("Attach the originality and AI report for written work.");
  p.status = "delivered";
  p.delivered_at = nowIso();
  p.delivery_note = cleanText(note, 2000).trim() || null;
  p.progress_percent = 100;
  p.progress_label = "Delivered";
  // The client can view the delivery now; downloads unlock on approval (PRD 9.4).
  for (const a of p.attachments) if (a.kind === "deliverable" || a.kind === "quality_report") a.client_visible = true;
  freeDoerSlots(p);
  touch(p);
  recountSupervisorLoad();
  systemMessage(p, "Your work has been delivered");
  log("delivered", p, "Delivered to the client", opName(actorId));
}

export function sendBack(projectId: string, reason: string, actorId: string) {
  const p = mustProject(projectId);
  assertSupervisorOwns(p, actorId);
  reason = cleanText(reason, 2000);
  if (p.status !== "in_review") throw portalError("Only work in final checks can be sent back.");
  if (reason.trim().length < 10) throw portalError("Tell the doer what needs to change (at least a sentence).");
  p.status = "in_progress";
  p.qc = null;
  p.qc_bounce_count += 1;
  p.last_bounce_reason = reason.trim();
  p.progress_label = "Changes requested in final checks";
  p.progress_updated_at = nowIso();
  touch(p);
  state.messages.push({
    id: nextId("m"), project_id: p.id, channel: "internal", sender_role: "coordinator", sender_label: opName(actorId), sender_id: actorId, discipline: null,
    body: `Sent back for changes: ${reason.trim()}`, state: "delivered", held_reason: null, screen_note: null, moderated_by: null, moderated_at: null, created_at: nowIso(), attachments: [],
  });
  log("progress", p, "Sent back to the doer for changes", opName(actorId));
}

/** Demo only: plays the doer marking work complete on Dolancer. */
export function simulateDoerSubmit(projectId: string) {
  const p = mustProject(projectId);
  if (p.status !== "in_progress") throw portalError("Only in-progress work can be submitted.");
  const active = p.doers.filter(isActiveDoer);
  if (!active.length) throw portalError("No doer is working on this project yet.");
  if (active.some((pd) => !pd.working_link)) throw portalError("The doer cannot work until the working link is set.");
  p.status = "in_review";
  p.progress_percent = 100;
  p.progress_label = "Submitted for final checks";
  p.progress_updated_at = nowIso();
  p.attachments.push(seed.attachment("revision", `${p.code.toLowerCase()}-submission.zip`, { uploaded_by_role: "expert", created_at: nowIso() }));
  touch(p);
  log("submitted_for_review", p, `${active.map((a) => a.doer_code).join(", ")} submitted for final checks`, active[0]?.doer_code ?? "Doer");
  notify("supervisor", "Work submitted", `${p.code} is in your QC queue.`, `/qc/${p.id}`, "info");
}

/** Self-assigned work: the supervisor sends their own work to quality check. */
export function submitOwnWork(projectId: string, actorId: string) {
  const p = mustProject(projectId);
  assertSupervisorOwns(p, actorId);
  if (p.status !== "in_progress" || !p.self_assigned) throw portalError("Only work you took on yourself can be sent this way.");
  p.status = "in_review";
  p.progress_percent = 100;
  p.progress_label = "Ready for quality check";
  p.progress_updated_at = nowIso();
  touch(p);
  log("submitted_for_review", p, "Supervisor finished the work personally", opName(actorId));
}

/** A doer's slot frees when their part is delivered or the project ends (BR-021). */
function freeDoerSlots(p: Project) {
  for (const pd of p.doers) {
    if (pd.status !== "accepted") continue;
    pd.status = "completed";
    const d = state.doers.find((x) => x.id === pd.doer_id);
    if (d) d.active_project_count = Math.max(0, d.active_project_count - 1);
  }
}

/** BR-007: silent release only after 14 days of client silence post delivery. */
export function releasePayout(projectId: string, actorId: string) {
  const p = mustProject(projectId);
  assertSupervisorOwns(p, actorId);
  if (p.status !== "delivered" || !p.delivered_at) throw portalError("Only delivered projects can be released.");
  if (p.payout_released_at) throw portalError("The payout was already released.");
  if (Date.now() - new Date(p.delivered_at).getTime() < SLA.silentRelease) throw portalError("Silent release opens 14 days after delivery.");
  p.payout_released_at = nowIso();
  touch(p);
  log("payout", p, "Payout released after 14 days of client silence", opName(actorId));
  notify("qqd", "Silent release", `${p.code} entered the disbursement queue.`, "/disbursement", "info");
}

/* ------------------------------------------------------------------ */
/* QQD: money (FR-SV-003, FR-SV-004)                                   */
/* ------------------------------------------------------------------ */

export function executePayout(projectDoerId: string, actorId: string) {
  const op = operator(actorId);
  if (op?.segment !== "qqd") throw portalError("Only QQD can execute payouts.");
  const p = state.projects.find((x) => x.doers.some((pd) => pd.id === projectDoerId));
  const pd = p?.doers.find((x) => x.id === projectDoerId);
  if (!p || !pd) throw portalError("That payout line was not found.");
  if (p.cancellation_reason === "refunded") throw portalError("This project was refunded. Apply the fault decision instead of paying.");
  if (p.status !== "completed" && !p.payout_released_at) throw portalError("Payout opens after client approval or a silent release.");
  const current = line(pd);
  if (current.status === "paid") throw portalError("This line was already paid.");
  if (current.gross_inr === 0) throw portalError("This payout is withheld by the liability decision.");
  const d = state.doers.find((x) => x.id === pd.doer_id);
  if (d?.verification_status !== "verified") throw portalError("PAN must be on file before any payout (FR-PO-003).");
  state.payouts.set(pd.id, { status: "paid", failure_reason: null, executed_by: op.full_name, executed_at: nowIso(), provider_ref: `pout_demo_${projectDoerId}` });
  state.fyPaid.set(pd.doer_id, (state.fyPaid.get(pd.doer_id) ?? 0) + current.gross_inr);
  pd.payout_status = "released";
  state.ledger.unshift({ id: nextId("lg"), type: "payout_executed", project_code: p.code, amount: current.net_inr, currency: "INR", inr_equivalent: current.net_inr, fx_rate: null, actor: op.full_name, provider_ref: `pout_demo_${projectDoerId}`, created_at: nowIso() });
  log("payout", p, `Paid ${pd.doer_code} ${formatInr(current.net_inr)} net (TDS ${formatInr(current.tds_inr)})`, op.full_name);
  // Withheld lines count as settled, so the reserve is still booked.
  const all = p.doers.filter(isActiveDoer).every((x) => state.payouts.get(x.id)?.status === "paid" || effectivePayout(x) === 0);
  if (all) {
    const reserve = reserveFor(projectMargin(p));
    state.ledger.unshift({ id: nextId("lg"), type: "reserve_held", project_code: p.code, amount: reserve, currency: "INR", inr_equivalent: reserve, fx_rate: null, actor: "System", provider_ref: null, created_at: nowIso() });
  }
}

export function executeRefund(refundId: string, actorId: string) {
  const op = operator(actorId);
  if (op?.segment !== "qqd") throw portalError("Only QQD can execute refunds.");
  const r = state.refunds.find((x) => x.id === refundId);
  if (!r) throw portalError("That refund was not found.");
  if (r.status === "executed") throw portalError("This refund was already executed.");
  // PRD 6.6: the supervisor decides doer fault before QQD moves money.
  if (!r.liability_decision) throw portalError("Waiting for the supervisor's fault decision.");
  r.status = "executed";
  r.executed_by = op.full_name;
  r.executed_at = nowIso();
  const p = state.projects.find((x) => x.id === r.project.id);
  if (p && r.kind === "full") {
    p.status = "cancelled";
    p.cancellation_reason = "refunded";
    p.cancelled_at = nowIso();
    freeDoerSlots(p);
    systemMessage(p, "This task was cancelled");
    touch(p);
    recountSupervisorLoad();
  }
  const inrEq = Math.round(r.amount * seed.DEMO_FX_TO_INR[r.currency]);
  state.ledger.unshift({ id: nextId("lg"), type: "refund_executed", project_code: r.project.code, amount: r.amount, currency: r.currency, inr_equivalent: inrEq, fx_rate: seed.DEMO_FX_TO_INR[r.currency], actor: op.full_name, provider_ref: `rfnd_demo_${r.id}`, created_at: nowIso() });
  log("refund", p ?? null, `Refund executed for ${r.project.code}`, op.full_name);
}

/** PRD 11.3 liability determination: the project's supervisor decides, with a reason. */
export function decideLiability(refundId: string, decision: NonNullable<RefundRequest["liability_decision"]>, reason: string, partialInr: Minor | null, actorId: string) {
  const r = state.refunds.find((x) => x.id === refundId);
  if (!r) throw portalError("That refund was not found.");
  if (r.status === "executed") throw portalError("This refund was already executed.");
  const p = mustProject(r.project.id);
  assertSupervisorOwns(p, actorId);
  reason = cleanText(reason, 1000).trim();
  if (reason.length < 10) throw portalError("Write the reason in a sentence. The doer can see it.");
  const working = p.doers.filter(isActiveDoer);
  if (decision === "partial") {
    const total = working.reduce((s, d) => s + d.payout_amount_inr, 0);
    if (!partialInr || partialInr <= 0 || partialInr >= total) throw portalError("Set a partial payout above zero and below the full payout.");
  }
  r.liability_decision = decision;
  r.liability_reason = reason;
  r.liability_decided_by = opName(actorId);
  // Apply to each doer line. Company process failure pays the doer in full.
  const total = working.reduce((s, d) => s + d.payout_amount_inr, 0) || 1;
  for (const pd of working) {
    pd.liability_decision = decision === "company_process" ? "not_at_fault" : decision;
    pd.partial_payout_inr = decision === "partial" && partialInr ? Math.round((partialInr * pd.payout_amount_inr) / total) : null;
  }
  touch(p);
  log("refund", p, `Fault decision recorded: ${decision.replace(/_/g, " ")}`, opName(actorId));
  notify("qqd", "Fault decision recorded", `${p.code} refund is ready to execute.`, "/refunds", "info");
}

/* ------------------------------------------------------------------ */
/* Revisions, flags, doer replacement, history                         */
/* ------------------------------------------------------------------ */

/** Demo only: the client asks for changes on a delivery (PRD BR-012: 3 free). */
export function simulateClientRevision(projectId: string, reason: string) {
  const p = mustProject(projectId);
  if (p.status !== "delivered") throw portalError("Only delivered work can be sent back by the client.");
  if (p.revision_count >= FREE_REVISIONS) throw portalError("All 3 free revisions are used. Further changes need a paid quote.");
  p.revision_count += 1;
  p.client_revision_reason = cleanText(reason, 1000).trim() || "Please adjust as discussed.";
  p.status = "in_progress";
  p.qc = null;
  p.qc_bounce_count = 0;
  p.progress_percent = 80;
  p.progress_label = `Revision ${p.revision_count} of ${FREE_REVISIONS}`;
  p.progress_updated_at = nowIso();
  for (const a of p.attachments) if (a.kind === "deliverable") a.client_visible = false;
  // The doers who delivered pick the work back up.
  for (const pd of p.doers) {
    if (pd.status !== "completed") continue;
    pd.status = "accepted";
    const d = state.doers.find((x) => x.id === pd.doer_id);
    if (d) d.active_project_count += 1;
  }
  touch(p);
  recountSupervisorLoad();
  systemMessage(p, "Revision requested");
  log("progress", p, `Client asked for changes (revision ${p.revision_count} of ${FREE_REVISIONS})`, "Client");
  if (p.supervisor_id === seed.DEMO_IDENTITY.supervisor) {
    notify("supervisor", "Client asked for changes", `${p.code}: ${p.client_revision_reason}`, `/projects/${p.id}`, "warning");
  }
}

/** Demo only: the client approves. Payouts open for QQD (PRD 6.1 step 23). */
export function simulateClientApprove(projectId: string) {
  const p = mustProject(projectId);
  if (p.status !== "delivered") throw portalError("Only delivered work can be approved.");
  p.status = "completed";
  p.approved_at = nowIso();
  freeDoerSlots(p);
  touch(p);
  systemMessage(p, "You approved this delivery. Project complete.");
  log("approved", p, "Client approved the delivery", "Client");
  notify("qqd", "Ready to pay", `${p.code} was approved. Pay the doer within 24 hours.`, "/disbursement", "info");
}

/** Demo only: the client raises a flag. The third opens a critical Support ticket (PRD 6.5). */
export function simulateClientFlag(projectId: string, reason: Flag["reason"], detail: string) {
  const p = mustProject(projectId);
  if (p.status !== "in_progress" && p.status !== "in_review" && p.status !== "delivered") throw portalError("Flags are raised on live work.");
  if (p.flag_count >= MAX_FLAGS) throw portalError("This project already has 3 flags. The client goes through Support now.");
  p.flags.push({ id: nextId("fl"), reason, detail: cleanText(detail, 500).trim() || "The client is not happy with progress.", raised_at: nowIso(), resolved_at: null });
  p.flag_count += 1;
  touch(p);
  systemMessage(p, "This project has been escalated");
  log("flag", p, `Client raised flag ${p.flag_count} of ${MAX_FLAGS}: ${reason.replace("_", " ")}`, "Client");
  if (p.supervisor_id === seed.DEMO_IDENTITY.supervisor) {
    notify("supervisor", `Flag ${p.flag_count} of 3`, `${p.code}: reply within 2 hours.`, `/projects/${p.id}`, "danger");
  }
  if (p.flag_count === MAX_FLAGS) {
    const ref = `SUP-000${420 + state.tickets.length}`;
    state.tickets.unshift({
      id: nextId("t"), reference: ref, subject: `Third flag raised on ${p.code}`, category: reason === "delay" ? "delay_complaint" : "quality_complaint", priority: "critical",
      status: "new", source: "third_flag", owner_id: null, project_id: p.id, project_code: p.code, requester: { role: "client", label: p.client.display_name },
      created_at: nowIso(), first_response_at: null, resolved_at: null, resolution: null, refund_recommendation: null,
      entries: [{ id: nextId("te"), kind: "event", author_label: "System", body: "Third flag raised. Escalated to QQD and Support.", created_at: nowIso() }],
    });
    notify("support", "Critical ticket", `${ref}: third flag on ${p.code}.`, "/tickets", "danger");
    notify("qqd", "Third flag", `${p.code} is escalated to QQD.`, `/projects/${p.id}`, "danger");
  }
}

/** Reply to a flag in the client thread and mark it handled (PRD 6.5). */
export function respondToFlag(projectId: string, flagId: string, message: string, actorId: string) {
  const p = mustProject(projectId);
  assertSupervisorOwns(p, actorId);
  const f = p.flags.find((x) => x.id === flagId);
  if (!f) throw portalError("That flag was not found.");
  if (f.resolved_at) throw portalError("This flag is already handled.");
  const text = cleanText(message, MESSAGE_MAX).trim();
  if (text.length < 20) throw portalError("Write the client a clear reply or plan.");
  sendMessage(p.id, "client", text, actorId);
  f.resolved_at = nowIso();
  touch(p);
  log("flag", p, `Replied to flag: ${f.reason.replace("_", " ")}`, opName(actorId));
}

/**
 * Take a doer off the project quietly (PRD 6.5, third flag). The client is told
 * nothing. Their slot frees, the link is cleared, and the part goes back to sourcing.
 */
export function replaceDoer(projectDoerId: string, reason: string, actorId: string) {
  const p = state.projects.find((x) => x.doers.some((pd) => pd.id === projectDoerId));
  const pd = p?.doers.find((x) => x.id === projectDoerId);
  if (!p || !pd) throw portalError("That doer was not found on this project.");
  assertSupervisorOwns(p, actorId);
  if (pd.status !== "accepted") throw portalError("Only a doer who is working can be replaced.");
  if (p.status !== "in_progress" && p.status !== "in_review") throw portalError("Doers can only be replaced while work is live.");
  reason = cleanText(reason, 1000).trim();
  if (reason.length < 10) throw portalError("Write why, in a sentence. It stays internal.");
  pd.status = "removed";
  pd.decline_reason = reason;
  pd.working_link = null;
  const d = state.doers.find((x) => x.id === pd.doer_id);
  if (d) d.active_project_count = Math.max(0, d.active_project_count - 1);
  if (p.status === "in_review") {
    p.status = "in_progress";
    p.qc = null;
  }
  p.failed_offer_count = 0;
  p.in_open_pool = false;
  touch(p);
  recountSupervisorLoad();
  log("offer_declined", p, `${pd.doer_code} taken off the project`, opName(actorId));
}

export function projectHistory(projectId: string, actorId: string) {
  const p = read.project(projectId, actorId);
  return clone(state.activity.filter((e) => e.project_id === p.id || e.project_code === p.code));
}

/* ------------------------------------------------------------------ */
/* Verification                                                        */
/* ------------------------------------------------------------------ */

function mustCase(id: string): VerificationCase {
  const c = state.verification.find((x) => x.id === id);
  if (!c) throw portalError("That verification case was not found.");
  return c;
}

export function recordDocumentCheck(caseId: string, patch: Pick<VerificationCase, "documents" | "payout_name_matches">, actorId: string) {
  assertSegment(actorId, "qqd");
  const c = mustCase(caseId);
  if (c.stage !== "document_check" && c.stage !== "awaiting_supervisor") throw portalError("This check is already done.");
  c.documents = patch.documents;
  c.payout_name_matches = patch.payout_name_matches;
  if (c.stage === "document_check" && c.documents.every((d) => d.legible && d.name_matches) && c.payout_name_matches) c.stage = "awaiting_supervisor";
}

export function assignOnboarding(caseId: string, supervisorId: string, actorId: string) {
  assertSegment(actorId, "qqd");
  const c = mustCase(caseId);
  if (c.stage !== "document_check" && c.stage !== "awaiting_supervisor") throw portalError("This doer is already past this step.");
  if (operator(supervisorId)?.segment !== "supervisor") throw portalError("Choose a supervisor.");
  if (c.documents.some((d) => !d.legible || !d.name_matches) || !c.payout_name_matches) throw portalError("Confirm every document and the payout name before assigning.");
  c.stage = "supervisor_call";
  c.assigned_supervisor_id = supervisorId;
}

export function decideVerification(caseId: string, approve: boolean, reason: string, actorId: string) {
  const c = mustCase(caseId);
  const op = operator(actorId);
  if (op?.segment === "supervisor" && c.assigned_supervisor_id !== actorId) throw portalError("This doer is assigned to another supervisor for onboarding.");
  if (op?.segment === "support") throw portalError("Support cannot verify doers.");
  if (c.stage === "verified" || c.stage === "rejected") throw portalError("This doer was already decided.");
  if (op?.segment === "supervisor" && c.stage !== "supervisor_call") throw portalError("This doer isn't ready for the identity call yet.");
  if (!approve && reason.trim().length < 10) throw portalError("Give the doer a clear reason and how to resubmit.");
  c.stage = approve ? "verified" : "rejected";
  c.rejection_reason = approve ? null : reason.trim();
  const d = state.doers.find((x) => x.id === c.doer_id);
  if (d) {
    d.verification_status = approve ? "verified" : "rejected";
    if (approve) d.level = 1;
  }
  log("ticket", null, `${c.doer_code} ${approve ? "verified, Level 1" : "verification rejected"}`, opName(actorId));
}

/* ------------------------------------------------------------------ */
/* Support                                                             */
/* ------------------------------------------------------------------ */

function mustTicket(id: string): Ticket {
  const t = state.tickets.find((x) => x.id === id);
  if (!t) throw portalError("That ticket was not found.");
  return t;
}

function addEntry(t: Ticket, kind: TicketEntry["kind"], author: string, body: string) {
  t.entries.push({ id: nextId("te"), kind, author_label: author, body, created_at: nowIso() });
}

export function replyTicket(ticketId: string, body: string, actorId: string, internal: boolean) {
  const t = mustTicket(ticketId);
  body = cleanText(body, 4000);
  if (!body.trim()) throw portalError("Write something first.");
  if (!TICKET_OPEN(t)) throw portalError("Reopen the ticket to reply.");
  if (operator(actorId)?.segment === "supervisor") throw portalError("Tickets are handled by Support and QQD.");
  // Internal notes are never visible to the requester (PRD 11.3).
  addEntry(t, internal ? "internal_note" : "reply", internal ? opName(actorId) : "Support", body.trim());
  if (!internal && !t.first_response_at) t.first_response_at = nowIso();
  if (!internal && t.status === "new") t.status = "in_progress";
  if (!t.owner_id) t.owner_id = actorId;
}

const TICKET_OPEN = (t: Ticket) => t.status !== "resolved" && t.status !== "closed";

export function updateTicket(ticketId: string, patch: Partial<Pick<Ticket, "status" | "priority" | "owner_id" | "category">>, actorId: string) {
  assertSegment(actorId, "support", "qqd");
  const t = mustTicket(ticketId);
  if ((patch.status === "resolved" || patch.status === "closed") && !t.resolution) throw portalError("Record a resolution before closing (FR-SV-012).");
  const changes: string[] = [];
  if (patch.status && patch.status !== t.status) changes.push(`status to ${patch.status.replace(/_/g, " ")}`);
  if (patch.priority && patch.priority !== t.priority) changes.push(`priority to ${patch.priority}`);
  if (patch.owner_id !== undefined && patch.owner_id !== t.owner_id) changes.push(`owner to ${patch.owner_id ? opName(patch.owner_id) : "unassigned"}`);
  Object.assign(t, patch);
  if (changes.length) addEntry(t, "event", opName(actorId), `Changed ${changes.join(", ")}`);
}

export function resolveTicket(ticketId: string, resolution: string, actorId: string) {
  assertSegment(actorId, "support", "qqd");
  const t = mustTicket(ticketId);
  resolution = cleanText(resolution, 2000);
  if (resolution.trim().length < 10) throw portalError("Describe the resolution in a sentence or two.");
  t.resolution = resolution.trim();
  t.status = "resolved";
  t.resolved_at = nowIso();
  addEntry(t, "event", opName(actorId), "Resolved");
}

/** Support may recommend a refund; only QQD executes one (PRD 11.3 rule). */
export function recommendRefund(ticketId: string, rec: NonNullable<Ticket["refund_recommendation"]>, actorId: string) {
  assertSegment(actorId, "support");
  const t = mustTicket(ticketId);
  if (!t.project_code) throw portalError("Link the ticket to a project before recommending a refund.");
  // One recommendation per ticket, so a refund can never be queued twice.
  if (t.refund_recommendation || state.refunds.some((r) => r.ticket_reference === t.reference && r.status !== "failed")) {
    throw portalError("A refund is already recommended for this ticket.");
  }
  if (rec.amount <= 0) throw portalError("Enter a refund amount.");
  if (rec.note.trim().length < 20) throw portalError("Explain the recommendation so QQD can act on it.");
  const p = state.projects.find((x) => x.code === t.project_code);
  if (p && (p.status === "completed" || p.approved_at)) throw portalError("The refund window closed at client approval.");
  if (p && rec.amount > (p.quote_amount ?? 0)) throw portalError("A refund cannot exceed the amount paid.");
  t.refund_recommendation = { ...rec, note: rec.note.trim() };
  t.status = "awaiting_internal";
  addEntry(t, "event", opName(actorId), `Recommended a ${rec.kind} refund and sent it to QQD`);
  state.refunds.unshift({
    id: nextId("rf"), ticket_reference: t.reference,
    project: p
      ? { id: p.id, code: p.code, title: p.title, category: p.category, quote_amount: p.quote_amount, quote_currency: p.quote_currency, quote_amount_inr: p.quote_amount_inr, status: p.status }
      : { id: "unknown", code: t.project_code, title: t.subject, category: "other", quote_amount: rec.amount, quote_currency: rec.currency, quote_amount_inr: null, status: "in_progress" },
    kind: rec.kind, amount: rec.amount, currency: rec.currency, recommended_by: opName(actorId), recommendation: rec.note.trim(),
    liability_decision: null, liability_reason: null, liability_decided_by: null, approved_at: nowIso(), status: "awaiting_execution", executed_by: null, executed_at: null,
  });
  notify("qqd", "Refund approved by Support", `${t.reference} ${rec.kind} refund for ${t.project_code} is waiting for the supervisor's fault decision.`, "/refunds", "info");
  if (p?.supervisor_id === seed.DEMO_IDENTITY.supervisor) {
    notify("supervisor", "Decide doer fault", `Support approved a refund on ${p.code}. Decide if the doer was at fault.`, `/projects/${p.id}`, "warning");
  }
}

/* ------------------------------------------------------------------ */
/* Training                                                            */
/* ------------------------------------------------------------------ */

export function createModule(input: Pick<TrainingModule, "title" | "description" | "audience" | "categories" | "has_assessment">, actorId: string) {
  assertSegment(actorId, "qqd"); // FR-SV-013
  if (input.title.trim().length < 4) throw portalError("Give the module a title.");
  const mod: TrainingModule = { id: nextId("tm"), ...input, title: cleanText(input.title, 120).trim(), description: cleanText(input.description, 500).trim(), state: "draft", completion_rate: 0, completions: 0, updated_at: nowIso(), body: "", video_url: null, files: [], questions: [], completion_by_category: {} };
  state.training.unshift(mod);
  return clone(mod);
}

export function setModuleState(id: string, next: TrainingModule["state"], actorId: string) {
  assertSegment(actorId, "qqd");
  const m = state.training.find((x) => x.id === id);
  if (!m) throw portalError("That module was not found.");
  m.state = next;
  m.updated_at = nowIso();
}


/* ------------------------------------------------------------------ */
/* QQD: re-quote, supervisor checks, training content, login pool      */
/* ------------------------------------------------------------------ */

/** Send a quoted task back to the quote queue, for example after it expired (PRD 6.8). */
export function reopenQuote(projectId: string, actorId: string) {
  assertSegment(actorId, "qqd");
  const p = mustProject(projectId);
  const cancelledByExpiry = p.status === "cancelled" && p.cancellation_reason === "quote_expired";
  if (p.status !== "awaiting_payment" && !cancelledByExpiry) throw portalError("Only an unpaid quote can be reopened.");
  p.status = "awaiting_quote";
  p.quote_amount = null;
  p.quote_amount_inr = null;
  p.quote_note = null;
  p.quote_expires_at = null;
  p.quote_sent_at = null;
  p.delivery_duration_hours = null;
  p.cancelled_at = null;
  p.cancellation_reason = null;
  p.created_at = nowIso();
  touch(p);
  log("quoted", p, "Sent back to the quote queue for a new quote", opName(actorId));
}

export function decideSupervisorApplication(id: string, approve: boolean, reason: string, actorId: string) {
  const op = assertSegment(actorId, "qqd"); // FR-SV-014: QQD verifies supervisors directly
  const a = state.applications.find((x) => x.id === id);
  if (!a) throw portalError("That application was not found.");
  if (a.status !== "pending") throw portalError("This application was already decided.");
  if (approve && (!a.id_checked || !a.interview_done)) throw portalError("Check their ID and finish the interview first.");
  reason = cleanText(reason, 1000).trim();
  if (!approve && reason.length < 10) throw portalError("Write the reason in a sentence.");
  a.status = approve ? "approved" : "rejected";
  a.decided_by = op.full_name;
  a.reason = approve ? null : reason;
  log("ticket", null, `${a.full_name} ${approve ? "approved as a supervisor" : "not approved"}`, op.full_name);
}

export function updateApplicationChecks(id: string, patch: Pick<SupervisorApplication, "id_checked" | "interview_done">, actorId: string) {
  assertSegment(actorId, "qqd");
  const a = state.applications.find((x) => x.id === id);
  if (!a || a.status !== "pending") throw portalError("This application can't be changed.");
  Object.assign(a, patch);
}

const VIDEO_HOSTS = ["youtube.com", "youtu.be", "vimeo.com", "loom.com"];

export function updateModule(
  id: string,
  patch: Pick<TrainingModule, "title" | "description" | "body" | "video_url" | "files" | "questions" | "audience" | "categories">,
  actorId: string,
) {
  assertSegment(actorId, "qqd");
  const m = state.training.find((x) => x.id === id);
  if (!m) throw portalError("That module was not found.");
  const title = cleanText(patch.title, 120).trim();
  if (title.length < 4) throw portalError("Give the module a title.");
  let video: string | null = null;
  if (patch.video_url && patch.video_url.trim()) {
    let u: URL;
    try {
      u = new URL(patch.video_url.trim());
    } catch {
      throw portalError("Enter the full video link, starting with https://");
    }
    const host = u.hostname.toLowerCase();
    if (u.protocol !== "https:" || !VIDEO_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) throw portalError("Use a YouTube, Vimeo or Loom link.");
    video = u.toString();
  }
  const questions: TrainingQuestion[] = patch.questions.map((q, i) => {
    const prompt = cleanText(q.prompt, 300).trim();
    const options = q.options.map((o) => cleanText(o, 200).trim()).filter(Boolean);
    if (!prompt) throw portalError(`Question ${i + 1} needs a question.`);
    if (options.length < 2) throw portalError(`Question ${i + 1} needs at least two answers.`);
    if (q.answer < 0 || q.answer >= options.length) throw portalError(`Pick the right answer for question ${i + 1}.`);
    return { id: q.id || nextId("q"), prompt, options, answer: q.answer };
  });
  Object.assign(m, {
    title,
    description: cleanText(patch.description, 500).trim(),
    body: cleanText(patch.body, 20000),
    video_url: video,
    files: patch.files.map((f) => cleanText(f, 200)).slice(0, 10),
    questions,
    has_assessment: questions.length > 0,
    audience: patch.audience,
    categories: patch.categories,
    updated_at: nowIso(),
  });
  return clone(m);
}

export function addWorkspaceLogins(count: number, actorId: string) {
  assertSegment(actorId, "qqd");
  if (!Number.isInteger(count) || count < 1 || count > 50) throw portalError("Add between 1 and 50 logins.");
  state.poolSize += count;
  log("working_link_set", null, `Added ${count} workspace logins (${state.poolSize} total)`, opName(actorId));
}


/* ------------------------------------------------------------------ */
/* Escalation, reassignment, preferences                                */
/* ------------------------------------------------------------------ */

/** PRD 11.3 ticket source "Supervisor escalation": a supervisor asks Support for help. */
export function escalateToSupport(
  projectId: string,
  input: { category: Ticket["category"]; priority: Ticket["priority"]; subject: string; body: string },
  actorId: string,
) {
  const p = mustProject(projectId);
  assertSupervisorOwns(p, actorId);
  const subject = cleanText(input.subject, 140).trim();
  const body = cleanText(input.body, 4000).trim();
  if (subject.length < 5) throw portalError("Add a short subject.");
  if (body.length < 20) throw portalError("Tell Support what happened and what you need.");
  const t: Ticket = {
    id: nextId("t"), reference: `SUP-000${430 + state.tickets.length}`, subject, category: input.category, priority: input.priority, status: "new",
    source: "supervisor_escalation", owner_id: null, project_id: p.id, project_code: p.code, requester: { role: "internal", label: opName(actorId) },
    created_at: nowIso(), first_response_at: null, resolved_at: null, resolution: null, refund_recommendation: null,
    entries: [{ id: nextId("te"), kind: "requester", author_label: opName(actorId), body, created_at: nowIso() }],
  };
  state.tickets.unshift(t);
  log("ticket", p, `Escalated to Support: ${t.reference}`, opName(actorId));
  notify("support", "Supervisor escalation", `${t.reference}: ${subject}`, `/tickets/${t.id}`, input.priority === "critical" || input.priority === "high" ? "danger" : "info");
  return clone(t);
}

/** QQD hands a live project to another supervisor. The client sees no change (PRD 13.1). */
export function reassignSupervisor(projectId: string, supervisorId: string, reason: string, actorId: string) {
  assertSegment(actorId, "qqd");
  const p = mustProject(projectId);
  if (!["in_progress", "in_review", "delivered"].includes(p.status)) throw portalError("Only live projects can change supervisor.");
  if (!p.supervisor_id) throw portalError("Assign a supervisor first.");
  if (p.supervisor_id === supervisorId) throw portalError("That supervisor already has this project.");
  const to = operator(supervisorId);
  if (to?.segment !== "supervisor") throw portalError("Choose a supervisor.");
  reason = cleanText(reason, 500).trim();
  if (reason.length < 5) throw portalError("Add a short reason.");
  const from = opName(p.supervisor_id);
  p.supervisor_id = supervisorId;
  touch(p);
  recountSupervisorLoad();
  log("supervisor_assigned", p, `Moved from ${from} to ${to.full_name}: ${reason}`, opName(actorId));
  if (supervisorId === seed.DEMO_IDENTITY.supervisor) notify("supervisor", "Project handed to you", `${p.code} ${p.title}`, `/projects/${p.id}`, "info");
}

const DEFAULT_PREFS: OperatorPreferences = {
  notify_in_app: true, notify_email: true, notify_whatsapp: false, notify_push: true, quiet_from: null, quiet_to: null, urgent_breaks_quiet: true,
};
const prefs = new Map<string, OperatorPreferences>();

export function readPreferences(operatorId: string): OperatorPreferences {
  return clone(prefs.get(operatorId) ?? DEFAULT_PREFS);
}

export function savePreferences(operatorId: string, next: OperatorPreferences) {
  if (!operator(operatorId)) throw portalError("Sign in again.");
  if (!next.notify_in_app && !next.notify_email && !next.notify_whatsapp && !next.notify_push) throw portalError("Keep at least one way to reach you.");
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if ((next.quiet_from && !time.test(next.quiet_from)) || (next.quiet_to && !time.test(next.quiet_to))) throw portalError("Use times like 22:00.");
  if (Boolean(next.quiet_from) !== Boolean(next.quiet_to)) throw portalError("Set both a start and an end for quiet hours.");
  prefs.set(operatorId, clone(next));
}

/* ------------------------------------------------------------------ */
/* Operators and notifications                                         */
/* ------------------------------------------------------------------ */

export function setOnDuty(operatorId: string, onDuty: boolean) {
  const op = operator(operatorId);
  if (op) op.on_duty = onDuty;
}

export function markNotificationRead(segment: Segment, id: string | "all") {
  for (const n of state.notifications[segment]) {
    if ((id === "all" || n.id === id) && !n.read_at) n.read_at = nowIso();
  }
}

/** Level percentage guidance for an offer (PRD 10.6 note: guidance, not a calculation). */
export function suggestedPayout(p: Project, level: 1 | 2 | 3): Minor {
  return percentOf(p.quote_amount_inr ?? 0, LEVEL_CUT[level]);
}
