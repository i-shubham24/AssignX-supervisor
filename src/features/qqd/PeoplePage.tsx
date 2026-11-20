import { useState } from "react";
import { Star } from "lucide-react";
import { useDoers, useOperators } from "@/api/hooks";
import { PageHeader, Panel, Segmented } from "@/components/portal/kit";
import { QueueTable } from "@/components/portal/QueueTable";
import { CategoryBadge, Code, Pill } from "@/components/portal/pills";
import { LoadMeter } from "@/features/overview/OverviewPage";
import { SEGMENTS } from "@/lib/config";
import { formatDate, formatRelative } from "@/lib/datetime";

/** Doer and staff directory with status (PRD 11.1 People). */
export default function PeoplePage() {
  const [tab, setTab] = useState<"staff" | "doers">("staff");
  const operators = useOperators();
  const doers = useDoers();
  return (
    <>
      <PageHeader title="People" sub="QQD and Admin roles are set in AdminX." />
      <Segmented className="mb-4" aria-label="Directory" value={tab} onChange={setTab} options={[{ value: "staff", label: "Staff", count: operators.data?.length }, { value: "doers", label: "Doers", count: doers.data?.length }]} />
      <Panel padded={false}>
        {tab === "staff" ? (
          <QueueTable
            caption="Portal staff"
            rows={operators.data}
            loading={operators.isLoading}
            rowKey={(o) => o.id}
            empty={{ title: "No staff" }}
            columns={[
              { key: "n", header: "Name", cell: (o) => <div><div className="text-[13.5px] font-semibold">{o.full_name}</div><div className="text-xs text-ink-3">{o.email}</div></div>, sort: (o) => o.full_name },
              { key: "s", header: "Segment", width: "150px", cell: (o) => <Pill tone={o.segment === "qqd" ? "success" : o.segment === "support" ? "warning" : "violet"} dot={false}>{SEGMENTS[o.segment].label}{o.is_lead ? " lead" : ""}</Pill> },
              { key: "c", header: "Categories", cell: (o) => (o.categories.length ? <div className="flex flex-wrap gap-1">{o.categories.map((c) => <CategoryBadge key={c} category={c} short />)}</div> : <span className="text-xs text-ink-3">All</span>) },
              { key: "l", header: "Load", width: "170px", cell: (o) => (o.segment === "supervisor" ? <LoadMeter value={o.active_project_count} /> : <span className="text-xs text-ink-3">N/A</span>) },
              { key: "r", header: "Rating", width: "90px", cell: (o) => (o.average_rating ? <span className="flex items-center gap-1 font-semibold"><Star className="h-3.5 w-3.5 fill-warning-dot text-warning-dot" />{o.average_rating.toFixed(1)}</span> : <span className="text-ink-3">N/A</span>) },
              { key: "d", header: "Duty", width: "100px", cell: (o) => <Pill tone={o.on_duty ? "success" : "neutral"}>{o.on_duty ? "On duty" : "Off"}</Pill> },
              { key: "j", header: "Joined", width: "120px", cell: (o) => <span className="text-xs text-ink-muted">{formatDate(o.joined_at)}</span> },
            ]}
          />
        ) : (
          <QueueTable
            caption="Doers"
            rows={doers.data}
            loading={doers.isLoading}
            rowKey={(d) => d.id}
            href={(d) => `/doers/${d.id}`}
            empty={{ title: "No doers" }}
            columns={[
              { key: "c", header: "Doer", cell: (d) => <div><Code className="text-ink">{d.doer_code}</Code><div className="text-[13px] font-semibold">{d.full_name}</div></div>, sort: (d) => d.doer_code },
              { key: "f", header: "Disciplines", cell: (d) => <div className="flex flex-wrap gap-1">{d.fields.map((f) => <CategoryBadge key={f} category={f} short />)}</div> },
              { key: "l", header: "Level", width: "80px", cell: (d) => <b>L{d.level}</b>, sort: (d) => d.level },
              { key: "v", header: "Verification", width: "130px", cell: (d) => <Pill tone={d.verification_status === "verified" ? "success" : d.verification_status === "rejected" ? "danger" : "warning"}>{d.verification_status}</Pill> },
              { key: "s", header: "Account", width: "110px", cell: (d) => <Pill tone={d.status === "active" ? "neutral" : "danger"}>{d.status}</Pill> },
              { key: "a", header: "Last active", width: "120px", cell: (d) => <span className="text-xs text-ink-muted">{formatRelative(d.last_active_at)}</span> },
            ]}
          />
        )}
      </Panel>
    </>
  );
}
