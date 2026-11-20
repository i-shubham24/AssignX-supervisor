import { useMemo } from "react";
import { ClipboardCheck } from "lucide-react";
import { useProjects } from "@/api/hooks";
import { useMe } from "@/providers/SessionProvider";
import { PageHeader, Panel, SlaClock } from "@/components/portal/kit";
import { QueueTable } from "@/components/portal/QueueTable";
import { Pill } from "@/components/portal/pills";
import { Ago, ProjectCell } from "@/features/projects/cells";
import { isActiveDoer, isQc } from "@/features/projects/queues";
import { QC_CHECKLISTS, SLA } from "@/lib/config";
import { readSla, slaRank } from "@/lib/sla";
import { HOUR } from "@/lib/datetime";

/** Work submitted by doers awaiting review. Oldest submission first (PRD 11.2). */
export default function QcQueuePage() {
  const me = useMe();
  const { data, isLoading, error, refetch } = useProjects();
  const rows = useMemo(
    () =>
      (data ?? [])
        .filter((p) => p.supervisor_id === me.id && isQc(p))
        .sort((a, b) => slaRank(readSla(a.progress_updated_at, SLA.qc.target, SLA.qc.escalate)) - slaRank(readSla(b.progress_updated_at, SLA.qc.target, SLA.qc.escalate))),
    [data, me.id],
  );

  return (
    <>
      <PageHeader title="Quality check" sub="Finished work waiting for your review." />
      <Panel padded={false}>
        <QueueTable
          caption="Quality check"
          rows={isLoading ? undefined : rows}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          rowKey={(p) => p.id}
          href={(p) => `/qc/${p.id}`}
          empty={{ icon: <ClipboardCheck />, title: "Nothing to check", body: "Work shows up here when a doer marks it done." }}
          columns={[
            { key: "project", header: "Project", cell: (p) => <ProjectCell p={p} /> },
            { key: "doer", header: "Submitted by", width: "140px", cell: (p) => <span className="font-mono text-xs font-semibold">{p.doers.filter(isActiveDoer).map((d) => d.doer_code).join(", ")}</span> },
            {
              key: "qc",
              header: "Checklist",
              width: "130px",
              cell: (p) => {
                const total = p.category === "other" ? p.qc?.custom_checks.length ?? 0 : QC_CHECKLISTS[p.category].length;
                const done = p.category === "other" ? p.qc?.custom_checks.filter((c) => c.done).length ?? 0 : QC_CHECKLISTS[p.category].filter((i) => p.qc?.checks[i.id]).length;
                return <Pill tone={done && done === total ? "success" : done ? "warning" : "neutral"}>{done} of {total || "?"}</Pill>;
              },
            },
            { key: "revisions", header: "Revision", width: "100px", cell: (p) => <span className="text-xs text-ink-muted">{p.revision_count ? `Round ${p.revision_count + 1}` : "First pass"}</span> },
            { key: "sla", header: "Time left", width: "130px", cell: (p) => <SlaClock since={p.progress_updated_at} target={SLA.qc.target} escalate={SLA.qc.escalate} /> },
            { key: "deadline", header: "Client deadline", width: "140px", cell: (p) => <SlaClock deadline={p.deadline_utc} warnWithin={24 * HOUR} /> },
            { key: "submitted", header: "Submitted", width: "110px", cell: (p) => <Ago at={p.progress_updated_at} /> },
          ]}
        />
      </Panel>
    </>
  );
}
