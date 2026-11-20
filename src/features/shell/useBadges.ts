import { useMemo } from "react";
import { EMPTY, useApplications, useDisbursements, useHeld, useProjects, useRefunds, useTickets, useVerification } from "@/api/hooks";
import { useMe } from "@/providers/SessionProvider";
import type { BadgeKey } from "@/routes/nav";
import { SLA, TICKET_STATUS } from "@/lib/config";
import { readSla } from "@/lib/sla";
import { isQuoteQueue, isAssignmentQueue, isSourcing, isActive, isQc, stalledReason } from "@/features/projects/queues";
import { useNow } from "@/components/portal/kit";

export interface Badge {
  count: number;
  urgent: boolean;
}

/** Live queue counts for the rail. A badge turns red when anything is past SLA. */
export function useBadges(): Partial<Record<BadgeKey, Badge>> {
  const me = useMe();
  const seg = me.segment;
  // Only fetch the queues this role can see (PRD 18.5).
  const projects = useProjects().data ?? EMPTY;
  const held = useHeld().data ?? EMPTY;
  const tickets = useTickets({ enabled: seg !== "supervisor" }).data ?? EMPTY;
  const verification = useVerification({ enabled: seg !== "support" }).data ?? EMPTY;
  const refunds = useRefunds({ enabled: seg === "qqd" }).data ?? EMPTY;
  const disbursements = useDisbursements({ enabled: seg === "qqd" }).data ?? EMPTY;
  const applications = useApplications({ enabled: seg === "qqd" }).data ?? EMPTY;
  // Re-evaluate on a clock so "late" turns red as time passes, not only on refetch.
  const now = useNow(30_000);

  return useMemo(() => {
    const breached = (since: string | null, target: number, escalate: number) => {
      const r = readSla(since, target, escalate, now);
      return r ? r.state === "breached" || r.state === "escalated" : false;
    };
    const mine = projects.filter((p) => p.supervisor_id === me.id);
    const quotes = projects.filter(isQuoteQueue);
    const assignment = projects.filter(isAssignmentQueue);
    const sourcing = mine.filter(isSourcing);
    const qc = mine.filter(isQc);
    const heldScoped = me.segment === "supervisor" ? held.filter((h) => mine.some((p) => p.id === h.project.id)) : held;
    const openTickets = tickets.filter((t) => TICKET_STATUS[t.status].open);

    return {
      quotes: { count: quotes.length, urgent: quotes.some((p) => breached(p.created_at, SLA.quote.target, SLA.quote.escalate)) },
      assignment: { count: assignment.length, urgent: assignment.some((p) => breached(p.paid_at, SLA.assignment.target, SLA.assignment.escalate)) },
      disbursement: { count: disbursements.filter((d) => d.lines.some((l) => l.status !== "paid" && l.status !== "withheld")).length, urgent: disbursements.some((d) => d.lines.some((l) => l.status === "failed")) },
      refunds: { count: refunds.filter((r) => r.status === "awaiting_execution").length, urgent: false },
      verification: { count: verification.filter((v) => v.stage === "document_check" || v.stage === "awaiting_supervisor").length, urgent: false },
      active: { count: mine.filter(isActive).length, urgent: mine.some((p) => p.flag_count > 0 && !p.flags.every((f) => f.resolved_at)) },
      sourcing: { count: sourcing.length, urgent: sourcing.some((p) => breached(p.supervisor_assigned_at, SLA.sourcing.target, SLA.sourcing.escalate)) },
      qc: { count: qc.length, urgent: qc.some((p) => breached(p.progress_updated_at, SLA.qc.target, SLA.qc.escalate)) },
      moderation: { count: heldScoped.length, urgent: heldScoped.some((h) => breached(h.message.created_at, SLA.moderation.target, SLA.moderation.escalate)) },
      onboarding: { count: verification.filter((v) => v.stage === "supervisor_call" && v.assigned_supervisor_id === me.id).length, urgent: false },
      applications: { count: applications.filter((a) => a.status === "pending").length, urgent: false },
      stalled: { count: projects.filter((p) => stalledReason(p, now)).length, urgent: projects.some((p) => (stalledReason(p, now)?.lateBy ?? 0) > 30 * 60_000) },
      tickets: { count: openTickets.length, urgent: openTickets.some((t) => t.priority === "critical" && !t.first_response_at) },
    };
  }, [projects, held, tickets, verification, refunds, disbursements, applications, me.id, me.segment, now]);
}
