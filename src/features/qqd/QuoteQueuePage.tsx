import { useMemo } from "react";
import { FileText } from "lucide-react";
import { useProjects } from "@/api/hooks";
import { PageHeader, Panel, SlaClock } from "@/components/portal/kit";
import { QueueTable } from "@/components/portal/QueueTable";
import { Pill } from "@/components/portal/pills";
import { Ago, ProjectCell } from "@/features/projects/cells";
import { isQuoteQueue } from "@/features/projects/queues";
import { SLA, URGENCY } from "@/lib/config";
import { formatDateTime } from "@/lib/datetime";

/** Oldest first, with Express and Urgent pinned above Standard (PRD 11.1). */
export default function QuoteQueuePage() {
  const { data, isLoading, error, refetch } = useProjects();
  const rows = useMemo(
    () => (data ?? []).filter(isQuoteQueue).sort((a, b) => URGENCY[a.urgency].rank - URGENCY[b.urgency].rank || a.created_at.localeCompare(b.created_at)),
    [data],
  );
  return (
    <>
      <PageHeader title="Quotes" sub="New tasks waiting for a quote." actions={<Pill tone="neutral">{rows.length} waiting</Pill>} />
      <Panel padded={false}>
        <QueueTable
          caption="Quotes"
          rows={isLoading ? undefined : rows}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          rowKey={(p) => p.id}
          href={(p) => `/quotes/${p.id}`}
          empty={{ icon: <FileText />, title: "No tasks waiting", body: "New tasks show up once the client verifies their email." }}
          columns={[
            { key: "p", header: "Task", cell: (p) => <ProjectCell p={p} showClient /> },
            { key: "u", header: "Urgency", width: "110px", cell: (p) => <Pill tone={URGENCY[p.urgency].tone} dot={false}>{URGENCY[p.urgency].label}</Pill> },
            { key: "c", header: "Currency", width: "90px", cell: (p) => <span className="font-mono text-xs font-semibold">{p.client.currency}</span> },
            { key: "d", header: "Client deadline", width: "150px", cell: (p) => <span className="text-[13px] text-ink-muted">{p.deadline_utc ? formatDateTime(p.deadline_utc) : "None"}</span> },
            { key: "s", header: "Submitted", width: "110px", sort: (p) => p.created_at, cell: (p) => <Ago at={p.created_at} /> },
            { key: "sla", header: "Time left", width: "130px", cell: (p) => <SlaClock since={p.created_at} target={SLA.quote.target} escalate={SLA.quote.escalate} /> },
          ]}
        />
      </Panel>
    </>
  );
}
