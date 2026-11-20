import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { EMPTY, useOperators, useProjects } from "@/api/hooks";
import { useMe } from "@/providers/SessionProvider";
import { PageHeader, Panel, Segmented, Money } from "@/components/portal/kit";
import { QueueTable } from "@/components/portal/QueueTable";
import { StatusPill } from "@/components/portal/pills";
import { Input } from "@/components/ui/field";
import { Ago, ProjectCell } from "./cells";
import type { ProjectStatus } from "@/types/domain";
import { STATUS } from "@/lib/config";

type Filter = "all" | ProjectStatus;

/** Read access to every project (Support per FR-SV-011, QQD for money questions). */
export default function AllProjectsPage() {
  const me = useMe();
  const { data, isLoading, error, refetch } = useProjects();
  const operators = useOperators().data ?? [];
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const all = data ?? EMPTY;
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all
      .filter((p) => filter === "all" || p.status === filter)
      .filter((p) => !t || p.code.toLowerCase().includes(t) || p.title.toLowerCase().includes(t) || p.client.display_name.toLowerCase().includes(t))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }, [all, q, filter]);
  const statuses: ProjectStatus[] = ["awaiting_quote", "awaiting_payment", "in_progress", "in_review", "delivered", "completed", "cancelled"];

  return (
    <>
      <PageHeader title="All projects" sub={me.segment === "support" ? "Read only, with full chat history." : undefined} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code, title or client" className="pl-9" aria-label="Search projects" />
        </div>
        <Segmented className="max-w-full overflow-x-auto whitespace-nowrap" aria-label="Status" value={filter} onChange={setFilter} options={[{ value: "all", label: "All", count: all.length }, ...statuses.map((s) => ({ value: s, label: STATUS[s].label, count: all.filter((p) => p.status === s).length }))]} />
      </div>
      <Panel padded={false}>
        <QueueTable
          caption="All projects"
          rows={isLoading ? undefined : rows}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          rowKey={(p) => p.id}
          href={(p) => (p.status === "awaiting_quote" && me.segment === "qqd" ? `/quotes/${p.id}` : `/projects/${p.id}`)}
          empty={{ title: "No projects match" }}
          columns={[
            { key: "p", header: "Project", cell: (p) => <ProjectCell p={p} showClient /> },
            { key: "s", header: "Status", width: "150px", cell: (p) => <StatusPill status={p.status} /> },
            { key: "sup", header: "Supervisor", width: "160px", cell: (p) => <span className="text-[13px]">{operators.find((o) => o.id === p.supervisor_id)?.full_name ?? <span className="text-ink-3">Unassigned</span>}</span> },
            { key: "q", header: "Quote", width: "130px", align: "right", sort: (p) => p.quote_amount_inr ?? 0, cell: (p) => (p.quote_amount !== null ? <Money amount={p.quote_amount} currency={p.quote_currency} /> : <span className="text-ink-3">Not quoted</span>) },
            { key: "u", header: "Updated", width: "120px", sort: (p) => p.updated_at, cell: (p) => <Ago at={p.updated_at} /> },
          ]}
        />
      </Panel>
    </>
  );
}
