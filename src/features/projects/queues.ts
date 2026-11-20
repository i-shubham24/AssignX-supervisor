import { SLA } from "@/lib/config";
import type { Project, ProjectDoer } from "@/types/domain";

export const isActiveDoer = (pd: ProjectDoer) => pd.status === "accepted" || pd.status === "completed";

/**
 * Queue membership (PRD 5.2). Every project sits in exactly one operational queue.
 * These predicates are the portal's reading of that table; the backend's queue
 * endpoint must return the same partitions.
 */

export const isQuoteQueue = (p: Project) => p.status === "awaiting_quote";
export const isAwaitingPayment = (p: Project) => p.status === "awaiting_payment";
export const isAssignmentQueue = (p: Project) => p.status === "in_progress" && Boolean(p.paid_at) && !p.supervisor_id;

export const hasActiveDoer = (p: Project) => p.self_assigned || p.doers.some(isActiveDoer);
export const openOffers = (p: Project) => p.doers.filter((d) => d.status === "offered");

/** Paid, supervised, and no doer has accepted yet. */
export const isSourcing = (p: Project) => p.status === "in_progress" && Boolean(p.supervisor_id) && !hasActiveDoer(p);

/** A doer accepted but has no working link, so they cannot start (FR-SV-007). */
export const needsWorkingLink = (p: Project) => p.status === "in_progress" && p.doers.some((d) => isActiveDoer(d) && !d.working_link);

export const isUnderway = (p: Project) => p.status === "in_progress" && hasActiveDoer(p);
export const isActive = (p: Project) => p.status === "in_progress" || p.status === "in_review";
export const isQc = (p: Project) => p.status === "in_review";
export const isDelivered = (p: Project) => p.status === "delivered";
export const openFlags = (p: Project) => p.flags.filter((f) => !f.resolved_at);

/* Stalled projects (PRD 5.2 DEV note) --------------------------------- */


export interface Stall {
  queue: string;
  owner: "QQD" | "Supervisor" | "Client";
  /** How long past the limit, in milliseconds. */
  lateBy: number;
}

/**
 * Where a project is stuck, if anywhere: the queue it sits in and how far past that
 * queue's time limit it is. Null means it is on time.
 */
export function stalledReason(p: Project, now = Date.now()): Stall | null {
  const over = (since: string | null | undefined, limit: number) => (since ? now - new Date(since).getTime() - limit : -1);
  let s: Stall | null = null;
  const check = (queue: string, owner: Stall["owner"], late: number) => {
    if (late > 0 && (!s || late > s.lateBy)) s = { queue, owner, lateBy: late };
  };
  if (isQuoteQueue(p)) check("Waiting for a quote", "QQD", over(p.created_at, SLA.quote.target));
  if (isAssignmentQueue(p)) check("Waiting for a supervisor", "QQD", over(p.paid_at, SLA.assignment.target));
  if (isSourcing(p)) check("Waiting for a doer", "Supervisor", over(p.supervisor_assigned_at, SLA.sourcing.target));
  if (isQc(p)) check("Waiting for quality check", "Supervisor", over(p.progress_updated_at, SLA.qc.target));
  if (isUnderway(p)) {
    check("Progress not updated", "Supervisor", over(p.progress_updated_at, SLA.progressStale));
    if (p.deadline_utc) check("Past the client deadline", "Supervisor", now - new Date(p.deadline_utc).getTime());
  }
  if (p.status === "delivered" && !p.payout_released_at) check("Client silent 14 days", "Supervisor", over(p.delivered_at, SLA.silentRelease));
  if (p.status === "awaiting_payment" && p.quote_expires_at) check("Quote expired, not paid", "Client", now - new Date(p.quote_expires_at).getTime());
  return s;
}
