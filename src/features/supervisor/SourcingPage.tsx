import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, UserPlus, Users } from "lucide-react";
import { useProjects } from "@/api/hooks";
import { useMe } from "@/providers/SessionProvider";
import { EmptyState, ErrorState, Money, PageHeader, Panel, SlaClock } from "@/components/portal/kit";
import { CategoryBadge, Code, Pill, UrgencyPill } from "@/components/portal/pills";
import { Button } from "@/components/ui/button";
import { isSourcing } from "@/features/projects/queues";
import { OfferDialog } from "@/features/projects/OfferDialog";
import type { Project } from "@/types/domain";
import { CATEGORIES, OPEN_POOL_AFTER_FAILED_OFFERS, SLA } from "@/lib/config";
import { readSla, slaRank } from "@/lib/sla";
import { formatRelative, HOUR } from "@/lib/datetime";

/** Projects that are paid and supervised but have no doer yet (PRD 11.2 Sourcing). */
export default function SourcingPage() {
  const me = useMe();
  const { data, isLoading, error, refetch } = useProjects();
  const [offerFor, setOfferFor] = useState<Project | null>(null);

  const rows = useMemo(
    () =>
      (data ?? [])
        .filter((p) => p.supervisor_id === me.id && isSourcing(p))
        .sort((a, b) => slaRank(readSla(a.supervisor_assigned_at, SLA.sourcing.target, SLA.sourcing.escalate)) - slaRank(readSla(b.supervisor_assigned_at, SLA.sourcing.target, SLA.sourcing.escalate))),
    [data, me.id],
  );

  return (
    <>
      <PageHeader title="Find a doer" sub="Paid projects with no doer yet." />
      {error ? (
        <Panel><ErrorState error={error} onRetry={() => void refetch()} /></Panel>
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-56 rounded-2xl" />)}</div>
      ) : rows.length === 0 ? (
        <Panel><EmptyState icon={<Users />} title="Every project has a doer" body="New projects that need a doer show up here." /></Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rows.map((p) => (
            <SourcingCard key={p.id} p={p} onOffer={() => setOfferFor(p)} />
          ))}
        </div>
      )}
      {offerFor ? <OfferDialog project={offerFor} open onOpenChange={(v) => !v && setOfferFor(null)} /> : null}
    </>
  );
}

function SourcingCard({ p, onOffer }: { p: Project; onOffer: () => void }) {
  const open = p.doers.filter((d) => d.status === "offered");
  const history = p.doers.filter((d) => d.status === "declined" || d.status === "expired");
  const unlocked = p.failed_offer_count >= OPEN_POOL_AFTER_FAILED_OFFERS;
  return (
    <section className="flex flex-col rounded-2xl border border-line-card bg-surface p-5 shadow-soft-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Code>{p.code}</Code>
        <CategoryBadge category={p.category} short />
        <UrgencyPill urgency={p.urgency} hideStandard />
        <SlaClock className="ml-auto" since={p.supervisor_assigned_at} target={SLA.sourcing.target} escalate={SLA.sourcing.escalate} />
      </div>
      <Link to={`/projects/${p.id}`} className="mt-2 text-[16px] font-bold tracking-[-0.01em] hover:text-primary-ink">{p.title}</Link>
      <p className="mt-1 line-clamp-2 text-[13px] text-ink-muted">{p.description}</p>
      <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-surface-2 p-3 text-[12px] sm:grid-cols-3">
        <div><div className="text-ink-3">Quote</div><Money amount={p.quote_amount_inr} /></div>
        <div><div className="text-ink-3">Doer cost</div><Money amount={p.expected_doer_cost_inr} /></div>
        <div><div className="text-ink-3">Deadline</div><SlaClock deadline={p.deadline_utc} warnWithin={24 * HOUR} /></div>
      </div>
      <div className="mt-3 space-y-1.5">
        {open.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-info-dot/25 bg-info-bg px-3 py-1.5 text-[12.5px]">
            <Clock className="h-3.5 w-3.5 text-info-ink" aria-hidden="true" />
            Offer to <b className="font-mono">{d.doer_code}</b> for {CATEGORIES[d.discipline].short.toLowerCase()} expires
            <SlaClock className="ml-auto" deadline={d.offer_expires_at} warnWithin={30 * 60_000} />
          </div>
        ))}
        {history.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center gap-2 px-1 text-[12px] text-ink-3">
            <span className="font-mono">{d.doer_code}</span> {d.status} {formatRelative(d.offer_expires_at)}
            {d.decline_reason ? <span>: {d.decline_reason}</span> : null}
          </div>
        ))}
      </div>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <Button variant="primary" onClick={onOffer}>
          <UserPlus /> {p.failed_offer_count >= 2 ? "Raise and re-offer" : "Offer to a doer"}
        </Button>
        {unlocked ? <Pill tone="warning" dot={false}>Open pool unlocked</Pill> : <span className="text-xs text-ink-3">{p.failed_offer_count} of {OPEN_POOL_AFTER_FAILED_OFFERS} failed offers until open pool</span>}
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link to={`/projects/${p.id}`}>Open <ArrowRight /></Link>
        </Button>
      </div>
    </section>
  );
}
