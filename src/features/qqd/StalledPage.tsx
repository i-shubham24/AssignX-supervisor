import { useMemo } from "react";
import { AlarmClock } from "lucide-react";
import { useOperators, useProjects } from "@/api/hooks";
import { PageHeader, Panel, useNow } from "@/components/portal/kit";
import { QueueTable } from "@/components/portal/QueueTable";
import { Pill, StatusPill } from "@/components/portal/pills";
import { ProjectCell } from "@/features/projects/cells";
import { stalledReason } from "@/features/projects/queues";
import { formatSpan } from "@/lib/datetime";

/**
 * Every project past its queue's time limit, worst first (PRD 5.2: "the single most
 * valuable operational safeguard"). In production a job runs every 15 minutes and
 * alerts on these; this is the screen the alert links to.
 */
export default function StalledPage() {
  const { data, isLoading, error, refetch } = useProjects();
  const operators = useOperators().data ?? [];
  const now = useNow(30_000);
  const rows = useMemo(
    () =>
      (data ?? [])
        .map((p) => ({ p, s: stalledReason(p, now) }))
        .filter((x): x is { p: typeof x.p; s: NonNullable<typeof x.s> } => x.s !== null)
        .sort((a, b) => b.s.lateBy - a.s.lateBy),
    [data, now],
  );

  return (
    <>
      <PageHeader title="Stalled" sub="Projects past their time limit, worst first." actions={<Pill tone={rows.length ? "danger" : "success"}>{rows.length} stalled</Pill>} />
      <Panel padded={false}>
        <QueueTable
          caption="Stalled projects"
          rows={isLoading ? undefined : rows}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          rowKey={(r) => r.p.id}
          href={(r) => (r.p.status === "awaiting_quote" ? `/quotes/${r.p.id}` : `/projects/${r.p.id}`)}
          empty={{ icon: <AlarmClock />, title: "Nothing is stalled", body: "Every project is inside its time limit." }}
          columns={[
            { key: "p", header: "Project", cell: (r) => <ProjectCell p={r.p} /> },
            { key: "q", header: "Stuck at", width: "200px", cell: (r) => <span className="text-[13px] font-semibold">{r.s.queue}</span> },
            { key: "s", header: "Status", width: "150px", cell: (r) => <StatusPill status={r.p.status} /> },
            {
              key: "o",
              header: "Who acts",
              width: "160px",
              cell: (r) => (
                <span className="text-[13px]">
                  {r.s.owner === "Supervisor" ? operators.find((o) => o.id === r.p.supervisor_id)?.full_name ?? "Supervisor" : r.s.owner}
                </span>
              ),
            },
            { key: "l", header: "Late by", width: "120px", align: "right", sort: (r) => r.s.lateBy, cell: (r) => <Pill tone={r.s.lateBy > 3_600_000 ? "danger" : "warning"} dot={false}>{formatSpan(r.s.lateBy)}</Pill> },
          ]}
        />
      </Panel>
    </>
  );
}
