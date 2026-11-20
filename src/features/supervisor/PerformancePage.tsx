import { useMemo } from "react";
import { Star } from "lucide-react";
import { useProjects } from "@/api/hooks";
import { useMe } from "@/providers/SessionProvider";
import { PageHeader, Panel } from "@/components/portal/kit";
import { BarChart, RingGauge, SplitBar } from "@/components/portal/charts";
import { KpiStrip } from "@/features/overview/widgets";
import { CATEGORIES, FLAG_REASON } from "@/lib/config";
import { Code, Pill } from "@/components/portal/pills";
import { formatRelative } from "@/lib/datetime";

/**
 * Ratings, delivery record and flag history (PRD 11.2 My performance). The monthly
 * series is demo data until the backend exposes a per-supervisor history endpoint.
 */
export default function PerformancePage() {
  const me = useMe();
  const { data, isLoading } = useProjects();
  const mine = useMemo(() => (data ?? []).filter((p) => p.supervisor_id === me.id), [data, me.id]);
  const delivered = mine.filter((p) => p.delivered_at);
  const onTime = delivered.filter((p) => !p.deadline_utc || new Date(p.delivered_at!).getTime() <= new Date(p.deadline_utc).getTime());
  const flags = mine.flatMap((p) => p.flags.map((f) => ({ f, p })));
  const months = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
  const series = [9, 12, 11, 15, 14, delivered.length + 6].map((v, i) => ({ label: months[i] ?? "", value: v, detail: "delivered" }));
  const byCategory = Object.entries(
    mine.reduce<Record<string, number>>((acc, p) => {
      acc[p.category] = (acc[p.category] ?? 0) + 1;
      return acc;
    }, {}),
  );

  return (
    <>
      <PageHeader title="My stats" sub="Your ratings, deliveries and flags." />
      <KpiStrip
        loading={isLoading}
        items={[
          { label: "Coordinator rating", value: me.average_rating?.toFixed(2) ?? "New", foot: "From clients" },
          { label: "Delivered", value: delivered.length, foot: "All time" },
          { label: "On time", value: `${delivered.length ? Math.round((onTime.length / delivered.length) * 100) : 100}%`, foot: "Before the deadline" },
          { label: "Flags received", value: flags.length, foot: "On your projects" },
          { label: "Revisions", value: mine.reduce((s, p) => s + p.revision_count, 0), foot: "Asked for by clients" },
        ]}
      />
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title="Deliveries by month" sub="Sample data">
          <BarChart data={series} highlight={series.length - 1} height={200} ariaLabel="Deliveries by month" />
        </Panel>
        <Panel title="Quality score" sub="Deliveries with no flag">
          <div className="flex flex-col items-center">
            <RingGauge value={delivered.length ? ((delivered.length - flags.filter((x) => x.p.delivered_at).length) / delivered.length) * 100 : 100} label={<span className="flex items-center gap-1">{me.average_rating?.toFixed(1)}<Star className="h-5 w-5 fill-warning-dot text-warning-dot" /></span>} sub="average rating" />
          </div>
          <SplitBar className="mt-5" parts={byCategory.map(([c, n], i) => ({ label: CATEGORIES[c as keyof typeof CATEGORIES].short, value: n, className: ["bg-primary", "bg-doer", "bg-violet-dot", "bg-success-dot", "bg-warning-dot"][i % 5] ?? "bg-primary" }))} />
        </Panel>
      </div>
      <Panel className="mt-5" title="Flag history" padded={false}>
        {flags.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-3">No flags.</p>
        ) : (
          <ul className="divide-y divide-line-subtle">
            {flags.map(({ f, p }) => (
              <li key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Code>{p.code}</Code>
                <Pill tone="danger" dot={false}>{FLAG_REASON[f.reason]}</Pill>
                <span className="min-w-0 flex-1 truncate text-[13px]">{f.detail}</span>
                <span className="text-xs text-ink-3">{formatRelative(f.raised_at)}</span>
                <Pill tone={f.resolved_at ? "success" : "warning"}>{f.resolved_at ? "Resolved" : "Open"}</Pill>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
