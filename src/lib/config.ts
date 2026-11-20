/**
 * Business configuration the portal renders against.
 *
 * In production most of this lives in AdminX configuration (PRD 12.1) and arrives
 * from the backend. It is mirrored here so the portal works in demo mode and so the
 * values the UI depends on are reviewable in one place. Every value cites its PRD
 * section.
 */
import type {
  CategorySlug,
  DoerLevel,
  Flag,
  ProjectStatus,
  Segment,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  Urgency,
} from "@/types/domain";
import { HOUR, MINUTE } from "./datetime";

/* Categories (PRD 3.3, 4.4) ------------------------------------------ */

export const CATEGORIES: Record<CategorySlug, { label: string; short: string; expert: string }> = {
  writing: { label: "Writing & Content", short: "Writing", expert: "Writing Expert" },
  design: { label: "Design", short: "Design", expert: "Design Expert" },
  creative: { label: "Creative & Media", short: "Media", expert: "Media Expert" },
  it: { label: "IT & Software", short: "Software", expert: "Development Expert" },
  ai: { label: "AI Agents & Automations", short: "Automation", expert: "Automation Expert" },
  marketing: { label: "Marketing", short: "Marketing", expert: "Marketing Expert" },
  research: { label: "Research & Business", short: "Research", expert: "Research Expert" },
  other: { label: "Something Else", short: "Other", expert: "Expert" },
};

export const CATEGORY_SLUGS = Object.keys(CATEGORIES) as CategorySlug[];

/* Segments (PRD 11) --------------------------------------------------- */

export const SEGMENTS: Record<Segment, { label: string; long: string; blurb: string }> = {
  qqd: {
    label: "QQD",
    long: "Quoting, Quality & Disbursement",
    blurb: "Quotes, assigning supervisors, doer checks and payouts.",
  },
  supervisor: {
    label: "Supervisor",
    long: "Supervisor",
    blurb: "Finding doers, checking work and delivering it.",
  },
  support: {
    label: "Support",
    long: "Support",
    blurb: "Complaints, escalations and refunds.",
  },
};

/* Project status (PRD 9.2) -------------------------------------------- */

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "violet" | "primary";

export const STATUS: Record<ProjectStatus, { label: string; client: string; tone: Tone }> = {
  awaiting_quote: { label: "Awaiting quote", client: "Preparing your quote", tone: "warning" },
  awaiting_payment: { label: "Awaiting payment", client: "Quote ready", tone: "info" },
  in_progress: { label: "In progress", client: "In progress", tone: "primary" },
  in_review: { label: "Quality check", client: "Final checks", tone: "violet" },
  delivered: { label: "Delivered", client: "Ready for approval", tone: "info" },
  completed: { label: "Completed", client: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", client: "Cancelled", tone: "neutral" },
};

export const URGENCY: Record<Urgency, { label: string; tone: Tone; rank: number }> = {
  urgent: { label: "Urgent", tone: "danger", rank: 0 },
  express: { label: "Express", tone: "warning", rank: 1 },
  standard: { label: "Standard", tone: "neutral", rank: 2 },
};

/* Queue SLAs (PRD 5.2, 6.3, 11) --------------------------------------- */

export const SLA = {
  quote: { target: 30 * MINUTE, escalate: 45 * MINUTE },
  assignment: { target: 15 * MINUTE, escalate: 30 * MINUTE },
  sourcing: { target: 2 * HOUR, escalate: 4 * HOUR },
  qc: { target: 4 * HOUR, escalate: 8 * HOUR },
  moderation: { target: 15 * MINUTE, escalate: 30 * MINUTE },
  disbursement: { target: 24 * HOUR, escalate: 36 * HOUR },
  offerExpiry: 2 * HOUR,
  progressStale: 48 * HOUR,
  silentRelease: 14 * 24 * HOUR,
  firstFlagResponse: 2 * HOUR,
} as const;

/** Supervisors above four active projects are near capacity (PRD 11.1). */
export const SUPERVISOR_CAPACITY_WARN = 4;
/** A doer holds at most three concurrent projects (BR-021). */
export const DOER_CONCURRENCY_CAP = 3;
/** Direct offers that must fail before the open pool unlocks (FR-SV-008). */
export const OPEN_POOL_AFTER_FAILED_OFFERS = 2;
export const FREE_REVISIONS = 3;
export const MAX_FLAGS = 3;
export const QUOTE_NOTE_MAX = 500;
export const MESSAGE_MAX = 4000;

/* Doer levels (PRD 2.4, 10.6) ----------------------------------------- */

export const LEVEL_CUT: Record<DoerLevel, number> = { 1: 35, 2: 45, 3: 55 };

/* TDS and reserve (PRD 14.5, 14.6) ------------------------------------ */

export const TDS_RATE_PERCENT = 10;
/** Section 194J annual threshold, INR paise. Configurable in AdminX. */
export const TDS_THRESHOLD_INR = 30_000_00;
export const RESERVE_PERCENT_OF_MARGIN = 10;

/* QC checklists (PRD 11.2) -------------------------------------------- */

export const QC_CHECKLISTS: Record<CategorySlug, { id: string; label: string }[]> = {
  writing: [
    { id: "brief", label: "Brief coverage" },
    { id: "report", label: "Originality and AI report attached" },
    { id: "facts", label: "Factual accuracy" },
    { id: "tone", label: "Tone match" },
    { id: "format", label: "Formatting" },
  ],
  design: [
    { id: "source", label: "Editable source files present" },
    { id: "licensed", label: "Licensed assets only" },
    { id: "formats", label: "Required formats and resolutions" },
    { id: "brand", label: "Brand consistency" },
  ],
  creative: [
    { id: "licensed", label: "Licensed music and footage" },
    { id: "export", label: "Export quality" },
    { id: "aspect", label: "Format and aspect ratio" },
    { id: "audio", label: "Audio levels" },
  ],
  it: [
    { id: "tested", label: "Functionality tested" },
    { id: "review", label: "Code reviewed" },
    { id: "security", label: "Basic security checks" },
    { id: "handover", label: "Documentation and handover" },
  ],
  ai: [
    { id: "e2e", label: "End-to-end run tested" },
    { id: "credentials", label: "Credentials handled safely" },
    { id: "errors", label: "Error handling present" },
    { id: "handover", label: "Handover documentation" },
  ],
  marketing: [
    { id: "goal", label: "Deliverables match the stated goal" },
    { id: "sources", label: "Data sources verified" },
    { id: "access", label: "Account access returned" },
  ],
  research: [
    { id: "sources", label: "Sources verified" },
    { id: "accuracy", label: "Data accuracy" },
    { id: "originality", label: "Originality report where prose" },
    { id: "conclusions", label: "Conclusions supported" },
  ],
  other: [],
};

/* Flags (PRD 6.5) ------------------------------------------------------ */

export const FLAG_REASON: Record<Flag["reason"], string> = {
  delay: "Delay",
  quality: "Quality",
  communication: "Communication",
  scope_mismatch: "Scope mismatch",
  other: "Other",
};

/* Support (PRD 11.3) --------------------------------------------------- */

export const TICKET_CATEGORY: Record<TicketCategory, string> = {
  general: "General",
  billing: "Billing",
  refund_request: "Refund request",
  quality_complaint: "Quality complaint",
  delay_complaint: "Delay complaint",
  conduct: "Conduct",
  technical: "Technical",
  doer_issue: "Doer issue",
  other: "Other",
};

export const TICKET_PRIORITY: Record<TicketPriority, { label: string; tone: Tone; firstResponse: number; resolution: number; rank: number }> = {
  critical: { label: "Critical", tone: "danger", firstResponse: 30 * MINUTE, resolution: 4 * HOUR, rank: 0 },
  high: { label: "High", tone: "warning", firstResponse: 2 * HOUR, resolution: 24 * HOUR, rank: 1 },
  normal: { label: "Normal", tone: "info", firstResponse: 8 * HOUR, resolution: 72 * HOUR, rank: 2 },
  low: { label: "Low", tone: "neutral", firstResponse: 24 * HOUR, resolution: 7 * 24 * HOUR, rank: 3 },
};

export const TICKET_STATUS: Record<TicketStatus, { label: string; tone: Tone; open: boolean }> = {
  new: { label: "New", tone: "info", open: true },
  in_progress: { label: "In progress", tone: "primary", open: true },
  awaiting_requester: { label: "Awaiting requester", tone: "warning", open: true },
  awaiting_internal: { label: "Awaiting internal", tone: "violet", open: true },
  resolved: { label: "Resolved", tone: "success", open: false },
  closed: { label: "Closed", tone: "neutral", open: false },
};

/* Client-facing labels (PRD 4.3). The portal previews what the client sees. */
export const CLIENT_LABEL = {
  coordinator: "Coordinator",
  support: "Support",
} as const;
