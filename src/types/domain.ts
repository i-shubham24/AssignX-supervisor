/**
 * The portal's domain model.
 *
 * Field names follow the PRD data model (section 17) in snake_case on purpose: these
 * types are the contract the backend team implements behind each api function in
 * src/api. When the backend lands, a response that matches these shapes drops in
 * without touching a screen.
 *
 * Money: *_inr fields are INR paise. quote_amount is minor units in quote_currency.
 * Time: every *_at / *_utc field is an ISO 8601 UTC string.
 */
import type { Currency, Minor } from "@/lib/money";

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

/** A portal user holds exactly one segment (PRD 11). */
export type Segment = "qqd" | "supervisor" | "support";

export interface Operator {
  id: string;
  full_name: string;
  email: string;
  segment: Segment;
  /** Category slugs this operator is hired for. */
  categories: CategorySlug[];
  on_duty: boolean;
  /** Supervisors only. Above four is near capacity (PRD 11.1). */
  active_project_count: number;
  average_rating: number | null;
  /** QQD lead flag: receives SLA escalations. */
  is_lead: boolean;
  joined_at: string;
}

/* ------------------------------------------------------------------ */
/* Catalogue                                                           */
/* ------------------------------------------------------------------ */

export type CategorySlug = "writing" | "design" | "creative" | "it" | "ai" | "marketing" | "research" | "other";

export type Urgency = "standard" | "express" | "urgent";

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

export type ProjectStatus =
  | "awaiting_quote"
  | "awaiting_payment"
  | "in_progress"
  | "in_review"
  | "delivered"
  | "completed"
  | "cancelled";

export type CancellationReason = "client_cancelled" | "quote_expired" | "support_cancelled" | "refunded";

export type ClientSegment = "individual" | "business" | "agency" | "other";

/** What portal staff see about the client. Never sent to a doer. */
export interface ClientSummary {
  id: string;
  display_name: string;
  segment: ClientSegment;
  country: string;
  currency: Currency;
  projects_count: number;
}

export interface CategoryAnswer {
  question: string;
  answer: string;
}

export interface ProjectDoer {
  id: string;
  project_id: string;
  doer_id: string;
  doer_code: string;
  discipline: CategorySlug;
  payout_amount_inr: Minor;
  scope_note: string | null;
  working_link: string | null;
  offered_at: string;
  offer_expires_at: string;
  accepted_at: string | null;
  status: "offered" | "accepted" | "declined" | "expired" | "removed" | "completed";
  decline_reason: string | null;
  liability_decision: "not_at_fault" | "partial" | "at_fault" | null;
  /** Set by the supervisor when liability is partial: what this doer is paid instead. */
  partial_payout_inr: Minor | null;
  payout_status: "pending" | "released" | "withheld" | "failed";
  /** Training module the supervisor requires for this project only. */
  required_module_id: string | null;
  /** Anonymous company workspace login for this doer on this project (PRD 11.2). */
  workspace_identity: string | null;
}

export interface QcRecord {
  checks: Record<string, boolean>;
  /** Free-form checks, used by "Something else" where the supervisor defines them. */
  custom_checks: { label: string; done: boolean }[];
  notes: string;
  completed_at: string | null;
}

export interface Project {
  id: string;
  /** Display format AX-000123. */
  code: string;
  client: ClientSummary;
  category: CategorySlug;
  title: string;
  description: string;
  category_answers: CategoryAnswer[];
  urgency: Urgency;
  deadline_utc: string | null;
  status: ProjectStatus;

  quote_amount: Minor | null;
  quote_currency: Currency;
  quote_amount_inr: Minor | null;
  quote_note: string | null;
  delivery_duration_hours: number | null;
  quote_expires_at: string | null;
  quote_sent_at: string | null;
  credits_applied_inr: Minor;

  /** INTERNAL. Expected doer payout recorded at quote time. */
  expected_doer_cost_inr: Minor | null;
  /** INTERNAL. */
  margin_inr: Minor | null;
  qqd_id: string | null;
  supervisor_id: string | null;
  supervisor_assigned_at: string | null;

  progress_percent: number | null;
  progress_label: string | null;
  progress_updated_at: string | null;

  flag_count: number;
  revision_count: number;
  /** Times the supervisor sent work back in this round (Dolancer reads both). */
  qc_bounce_count: number;
  last_bounce_reason: string | null;
  /** What the client asked to change on the latest revision. */
  client_revision_reason: string | null;

  paid_at: string | null;
  delivered_at: string | null;
  approved_at: string | null;
  payout_released_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: CancellationReason | null;
  created_at: string;
  updated_at: string;

  doers: ProjectDoer[];
  /** Failed direct offers. Two unlock raise-and-retry and the open pool (FR-SV-008). */
  failed_offer_count: number;
  in_open_pool: boolean;
  self_assigned: boolean;
  qc: QcRecord | null;
  delivery_note: string | null;

  attachments: Attachment[];
  flags: Flag[];
  /** Counts the portal shows on queue rows. */
  unread_client: number;
  unread_internal: number;
  held_count: number;
}

export interface Flag {
  id: string;
  reason: "delay" | "quality" | "communication" | "scope_mismatch" | "other";
  detail: string;
  raised_at: string;
  resolved_at: string | null;
}

export type AttachmentKind = "brief" | "chat" | "snapshot" | "deliverable" | "quality_report" | "revision";

export interface Attachment {
  id: string;
  kind: AttachmentKind;
  filename: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by_role: "client" | "coordinator" | "expert";
  scan_status: "pending" | "clean" | "infected";
  client_visible: boolean;
  created_at: string;
  /** Snapshots only: the note shown to the client beside the image. */
  note?: string;
}

/* ------------------------------------------------------------------ */
/* Chat                                                                */
/* ------------------------------------------------------------------ */

export type Channel = "client" | "internal";
export type SenderRole = "client" | "coordinator" | "expert" | "support" | "system";
export type MessageState = "delivered" | "held" | "approved" | "removed";
export type HeldReason = "contact_details" | "identity_reveal";

export interface Message {
  id: string;
  project_id: string;
  channel: Channel;
  sender_role: SenderRole;
  /** Portal view of who sent it: operator name, doer code, or client name. */
  sender_label: string;
  sender_id: string | null;
  discipline: CategorySlug | null;
  body: string;
  state: MessageState;
  held_reason: HeldReason | null;
  /** Short explanation from the screening model, portal-only. */
  screen_note: string | null;
  moderated_by: string | null;
  moderated_at: string | null;
  created_at: string;
  attachments: Attachment[];
}

export interface HeldItem {
  message: Message;
  project: Pick<Project, "id" | "code" | "title" | "category" | "status">;
  /** The five messages before it, for context. */
  context: Message[];
}

/* ------------------------------------------------------------------ */
/* Doers                                                               */
/* ------------------------------------------------------------------ */

export type DoerLevel = 1 | 2 | 3;
export type Availability = "available" | "busy" | "away";
export type VerificationStatus = "unverified" | "submitted" | "verified" | "rejected";

export interface Doer {
  id: string;
  /** Display identifier, format R-1042. */
  doer_code: string;
  full_name: string;
  fields: CategorySlug[];
  sub_categories: string[];
  experience_tier: "new" | "intermediate" | "experienced" | "expert";
  level: DoerLevel;
  average_rating: number | null;
  projects_completed: number;
  active_project_count: number;
  availability: Availability;
  verification_status: VerificationStatus;
  /** Supervisors see whether they have worked with this doer before. */
  worked_with_me: boolean;
  on_time_rate: number | null;
  last_active_at: string;
  joined_at: string;
  status: "active" | "suspended" | "removed";
}

/* ------------------------------------------------------------------ */
/* Verification and onboarding                                         */
/* ------------------------------------------------------------------ */

export interface VerificationCase {
  id: string;
  doer_id: string;
  doer_code: string;
  full_name: string;
  declared_name: string;
  fields: CategorySlug[];
  submitted_at: string;
  stage: "document_check" | "awaiting_supervisor" | "supervisor_call" | "verified" | "rejected";
  documents: { kind: "pan" | "photo_id"; label: string; legible: boolean | null; name_matches: boolean | null }[];
  payout_method: "bank" | "upi" | null;
  payout_name_matches: boolean | null;
  assigned_supervisor_id: string | null;
  rejection_reason: string | null;
}

/* ------------------------------------------------------------------ */
/* Money                                                               */
/* ------------------------------------------------------------------ */

export interface DisbursementLine {
  project_doer_id: string;
  doer_code: string;
  discipline: CategorySlug;
  gross_inr: Minor;
  fy_paid_before_inr: Minor;
  tds_inr: Minor;
  net_inr: Minor;
  liability_decision: ProjectDoer["liability_decision"];
  status: "queued" | "executing" | "paid" | "failed" | "withheld";
  failure_reason: string | null;
  executed_by: string | null;
  executed_at: string | null;
  provider_ref: string | null;
}

export interface DisbursementItem {
  project: Pick<Project, "id" | "code" | "title" | "category" | "quote_amount" | "quote_currency" | "quote_amount_inr" | "credits_applied_inr">;
  trigger: "client_approved" | "silent_release";
  triggered_at: string;
  lines: DisbursementLine[];
  margin_inr: Minor;
  reserve_inr: Minor;
}

export interface RefundRequest {
  id: string;
  ticket_reference: string;
  project: Pick<Project, "id" | "code" | "title" | "category" | "quote_amount" | "quote_currency" | "quote_amount_inr" | "status">;
  kind: "full" | "partial";
  amount: Minor;
  currency: Currency;
  recommended_by: string;
  recommendation: string;
  /** Decided by the project's supervisor, never by Support (PRD 6.6 step 4, 11.3). */
  liability_decision: ProjectDoer["liability_decision"] | "company_process";
  liability_reason: string | null;
  liability_decided_by: string | null;
  approved_at: string;
  status: "awaiting_execution" | "executed" | "failed";
  executed_by: string | null;
  executed_at: string | null;
}

export interface LedgerEntry {
  id: string;
  type: "payment_captured" | "refund_executed" | "payout_executed" | "reserve_held" | "reserve_released" | "credits_applied";
  project_code: string;
  amount: Minor;
  currency: Currency;
  inr_equivalent: Minor;
  fx_rate: number | null;
  actor: string;
  provider_ref: string | null;
  created_at: string;
}

export interface RateBand {
  id: string;
  category: CategorySlug;
  scope_band: string;
  currency: Currency;
  low: Minor;
  typical: Minor;
  high: Minor;
}

/* ------------------------------------------------------------------ */
/* Support                                                             */
/* ------------------------------------------------------------------ */

export type TicketCategory =
  | "general"
  | "billing"
  | "refund_request"
  | "quality_complaint"
  | "delay_complaint"
  | "conduct"
  | "technical"
  | "doer_issue"
  | "other";
export type TicketPriority = "low" | "normal" | "high" | "critical";
export type TicketStatus = "new" | "in_progress" | "awaiting_requester" | "awaiting_internal" | "resolved" | "closed";
export type TicketSource = "contact_form" | "in_app" | "project_link" | "third_flag" | "doer_report" | "supervisor_escalation";

export interface TicketEntry {
  id: string;
  kind: "requester" | "reply" | "internal_note" | "event";
  author_label: string;
  body: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  /** Format SUP-000123. */
  reference: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  source: TicketSource;
  owner_id: string | null;
  project_id: string | null;
  project_code: string | null;
  requester: { role: "client" | "doer" | "internal"; label: string };
  created_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
  resolution: string | null;
  refund_recommendation: { kind: "full" | "partial"; amount: Minor; currency: Currency; note: string } | null;
  entries: TicketEntry[];
}

/* ------------------------------------------------------------------ */
/* Training                                                            */
/* ------------------------------------------------------------------ */

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  audience: "doer" | "supervisor" | "both";
  categories: CategorySlug[];
  state: "draft" | "published" | "archived";
  has_assessment: boolean;
  completion_rate: number;
  completions: number;
  updated_at: string;
  /** Plain text with blank lines between paragraphs. Rendered as text, never HTML. */
  body: string;
  video_url: string | null;
  files: string[];
  questions: TrainingQuestion[];
  /** Completion by category, for reporting (PRD 11.1). */
  completion_by_category: Partial<Record<CategorySlug, number>>;
}

export interface TrainingQuestion {
  id: string;
  prompt: string;
  options: string[];
  /** Index into options. */
  answer: number;
}

/** A supervisor account waiting for QQD to verify it (FR-SV-014). */
export interface SupervisorApplication {
  id: string;
  full_name: string;
  email: string;
  categories: CategorySlug[];
  years_experience: number;
  background: string;
  id_checked: boolean;
  interview_done: boolean;
  submitted_at: string;
  status: "pending" | "approved" | "rejected";
  decided_by: string | null;
  reason: string | null;
}

export interface OperatorPreferences {
  notify_in_app: boolean;
  notify_email: boolean;
  notify_whatsapp: boolean;
  notify_push: boolean;
  /** 24h clock, local time. Null means no quiet hours. */
  quiet_from: string | null;
  quiet_to: string | null;
  /** Only urgent items (late, flags, critical tickets) break quiet hours. */
  urgent_breaks_quiet: boolean;
}

export interface WorkspaceLogin {
  login: string;
  in_use: { project_id: string; project_code: string; doer_code: string; since: string | null } | null;
}

/* ------------------------------------------------------------------ */
/* Activity and notifications                                          */
/* ------------------------------------------------------------------ */

export interface ActivityEvent {
  id: string;
  project_id: string | null;
  project_code: string | null;
  kind:
    | "submitted"
    | "quoted"
    | "paid"
    | "supervisor_assigned"
    | "offer_sent"
    | "offer_accepted"
    | "offer_declined"
    | "working_link_set"
    | "progress"
    | "submitted_for_review"
    | "delivered"
    | "approved"
    | "flag"
    | "message_held"
    | "moderated"
    | "payout"
    | "refund"
    | "ticket";
  text: string;
  actor_label: string;
  created_at: string;
}

export interface PortalNotification {
  id: string;
  title: string;
  body: string;
  href: string | null;
  tone: "info" | "warning" | "danger" | "success";
  created_at: string;
  read_at: string | null;
}
