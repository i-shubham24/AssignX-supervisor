import { formatSpan } from "./datetime";

export type SlaState = "ok" | "due_soon" | "breached" | "escalated";

export interface SlaReading {
  state: SlaState;
  /** Milliseconds until the target (negative once breached). */
  remaining: number;
  label: string;
}

/**
 * Where an item stands against its queue SLA (PRD 5.2). Due soon is the last fifth
 * of the window. Escalated means past the escalation point, which is when the lead
 * is alerted.
 */
export function readSla(since: string | null | undefined, target: number, escalate: number, now = Date.now()): SlaReading | null {
  if (!since) return null;
  const elapsed = now - new Date(since).getTime();
  const remaining = target - elapsed;
  if (elapsed >= escalate) return { state: "escalated", remaining, label: `${formatSpan(elapsed - target)} late` };
  if (remaining <= 0) return { state: "breached", remaining, label: `${formatSpan(-remaining)} late` };
  if (remaining <= target * 0.2) return { state: "due_soon", remaining, label: `${formatSpan(remaining)} left` };
  return { state: "ok", remaining, label: `${formatSpan(remaining)} left` };
}

/** For a fixed deadline rather than an elapsed window. */
export function readDeadline(deadline: string | null | undefined, warnWithin: number, now = Date.now()): SlaReading | null {
  if (!deadline) return null;
  const remaining = new Date(deadline).getTime() - now;
  if (remaining <= 0) return { state: "breached", remaining, label: `${formatSpan(-remaining)} late` };
  if (remaining <= warnWithin) return { state: "due_soon", remaining, label: `${formatSpan(remaining)} left` };
  return { state: "ok", remaining, label: `${formatSpan(remaining)} left` };
}

export const slaRank = (r: SlaReading | null) => (r ? { escalated: 0, breached: 1, due_soon: 2, ok: 3 }[r.state] : 4);
