import { useMemo, useState } from "react";
import { Star, UserPlus } from "lucide-react";
import { useAction, useOperators, useProjects } from "@/api/hooks";
import * as api from "@/api/portal";
import { useMe } from "@/providers/SessionProvider";
import { EmptyState, ErrorState, Money, PageHeader, Panel, SlaClock } from "@/components/portal/kit";
import { CategoryBadge, Code, Pill, UrgencyPill } from "@/components/portal/pills";
import { Button } from "@/components/ui/button";
import { isAssignmentQueue } from "@/features/projects/queues";
import { LoadMeter } from "@/features/overview/OverviewPage";
import { SLA, SUPERVISOR_CAPACITY_WARN } from "@/lib/config";
import { readSla, slaRank } from "@/lib/sla";
import { formatRelative, HOUR } from "@/lib/datetime";
import { cn } from "@/lib/cn";
import type { Operator, Project } from "@/types/domain";

/**
 * Paid projects awaiting a supervisor (PRD 11.1). Manual selection: QQD sees each
 * supervisor's load, categories and rating. 15 minute SLA.
 */
export default function AssignmentPage() {
  const { data, isLoading, error, refetch } = useProjects();
  const operators = useOperators();
  const rows = useMemo(
    () => (data ?? []).filter(isAssignmentQueue).sort((a, b) => slaRank(readSla(a.paid_at, SLA.assignment.target, SLA.assignment.escalate)) - slaRank(readSla(b.paid_at, SLA.assignment.target, SLA.assignment.escalate))),
    [data],
  );
  const supervisors = (operators.data ?? []).filter((o) => o.segment === "supervisor");

  return (
    <>
      <PageHeader title="To assign" sub="Paid projects that need a supervisor." />
      {error ? (
        <Panel><ErrorState error={error} onRetry={() => void refetch()} /></Panel>
      ) : isLoading ? (
        <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <Panel><EmptyState icon={<UserPlus />} title="Nothing to assign" body="Paid projects show up here." /></Panel>
      ) : (
        <div className="space-y-4">
          {rows.map((p) => <AssignCard key={p.id} p={p} supervisors={supervisors} />)}
        </div>
      )}
    </>
  );
}

function AssignCard({ p, supervisors }: { p: Project; supervisors: Operator[] }) {
  const me = useMe();
  const ranked = [...supervisors].sort((a, b) => Number(b.categories.includes(p.category)) - Number(a.categories.includes(p.category)) || Number(b.on_duty) - Number(a.on_duty) || a.active_project_count - b.active_project_count);
  const [pick, setPick] = useState<string | null>(ranked.find((s) => s.on_duty && s.categories.includes(p.category))?.id ?? null);
  const assign = useAction(() => api.assignSupervisor(p.id, pick ?? "", me.id), { success: () => `Assigned to ${supervisors.find((s) => s.id === pick)?.full_name}.` });

  return (
    <section className="overflow-hidden rounded-2xl border border-line-card bg-surface shadow-soft-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-line-subtle px-5 py-3">
        <Code>{p.code}</Code>
        <CategoryBadge category={p.category} />
        <UrgencyPill urgency={p.urgency} hideStandard />
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{p.title}</span>
        <span className="text-xs text-ink-3">Paid {p.paid_at ? formatRelative(p.paid_at) : ""}</span>
        <Money amount={p.quote_amount} currency={p.quote_currency} className="text-[13px]" />
        <SlaClock since={p.paid_at} target={SLA.assignment.target} escalate={SLA.assignment.escalate} />
      </div>
      <div className="grid grid-cols-1 gap-0 md:grid-cols-[minmax(0,1fr)_220px]">
        <ul className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label={`Supervisor for ${p.code}`}>
          {ranked.map((s) => {
            const fits = s.categories.includes(p.category);
            const near = s.active_project_count > SUPERVISOR_CAPACITY_WARN;
            const selected = pick === s.id;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPick(s.id)}
                  className={cn(
                    "flex w-full flex-col rounded-xl border p-3 text-left transition-[border-color,background-color,box-shadow]",
                    selected ? "border-primary bg-primary-light/60 ring-2 ring-primary/15" : "border-line-card hover:border-line",
                    !fits && "opacity-70",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", s.on_duty ? "bg-success-dot" : "bg-neutral-dot")} role="img" aria-label={s.on_duty ? "On duty" : "Off duty"} />
                    <span className="truncate text-[13.5px] font-bold">{s.full_name}</span>
                    <span className="ml-auto flex items-center gap-0.5 text-xs font-semibold"><Star className="h-3 w-3 fill-warning-dot text-warning-dot" aria-hidden="true" />{s.average_rating?.toFixed(1)}</span>
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1">{s.categories.map((c) => <CategoryBadge key={c} category={c} short className={c === p.category ? "ring-1 ring-primary/40" : undefined} />)}</span>
                  <span className="mt-2"><LoadMeter value={s.active_project_count} /></span>
                  {near ? <span className="mt-1 text-[11px] font-semibold text-warning-ink">Near capacity</span> : null}
                  {!fits ? <span className="mt-1 text-[11px] text-ink-3">Outside their categories</span> : null}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col justify-between border-t border-line-subtle bg-surface-2 p-4 md:border-l md:border-t-0">
          <div className="text-[12.5px] text-ink-muted">
            <p>The client still sees one Coordinator.</p>
            <p className="mt-2">Deadline: <b className="text-ink-2"><SlaClock deadline={p.deadline_utc} warnWithin={24 * HOUR} /></b></p>
          </div>
          <Button variant="primary" className="mt-4 w-full" disabled={!pick} loading={assign.isPending} onClick={() => assign.mutate(undefined)}>
            <UserPlus /> Assign supervisor
          </Button>
          {pick && supervisors.find((s) => s.id === pick)?.on_duty === false ? <Pill tone="warning" className="mt-2 self-center">Off duty</Pill> : null}
        </div>
      </div>
    </section>
  );
}
