import { useMemo, useState } from "react";
import { FolderKanban, LayoutGrid, Rows3 } from "lucide-react";
import { useProjects } from "@/api/hooks";
import { useMe } from "@/providers/SessionProvider";
import { PageHeader, Panel, ProgressBar, SlaClock, Segmented } from "@/components/portal/kit";
import { QueueTable } from "@/components/portal/QueueTable";
import { StatusPill } from "@/components/portal/pills";
import { Ago, ProjectCell } from "@/features/projects/cells";
import { hasActiveDoer, isActiveDoer, isQc, isSourcing, isUnderway, needsWorkingLink, openFlags } from "@/features/projects/queues";
import { ProjectCard } from "@/features/overview/widgets";
import type { Project } from "@/types/domain";
import { HOUR } from "@/lib/datetime";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Filter = "all" | "attention" | "sourcing" | "working" | "qc" | "delivered";

export default function ActivePage() {
  const me = useMe();
  const { data, isLoading, error, refetch } = useProjects();
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setView] = useState<"table" | "cards">("table");

  const mine = useMemo(() => (data ?? []).filter((p) => p.supervisor_id === me.id && ["in_progress", "in_review", "delivered"].includes(p.status)), [data, me.id]);
  const attention = (p: Project) => openFlags(p).length > 0 || needsWorkingLink(p) || p.held_count > 0;
  const filters: Record<Filter, (p: Project) => boolean> = {
    all: () => true,
    attention,
    sourcing: isSourcing,
    working: isUnderway,
    qc: isQc,
    delivered: (p) => p.status === "delivered",
  };
  // Attention first, then nearest deadline.
  const rows = mine
    .filter(filters[filter])
    .sort((a, b) => Number(attention(b)) - Number(attention(a)) || (a.deadline_utc ?? "9").localeCompare(b.deadline_utc ?? "9"));

  return (
    <>
      <PageHeader
        title="My projects"
        sub="Your projects, from payment to approval."
        actions={
          <div className="flex items-center gap-1 rounded-full border border-line-card bg-surface p-1 shadow-soft-sm">
            <Button size="icon-sm" variant={view === "table" ? "dark" : "ghost"} onClick={() => setView("table")} aria-label="Table view" aria-pressed={view === "table"}>
              <Rows3 />
            </Button>
            <Button size="icon-sm" variant={view === "cards" ? "dark" : "ghost"} onClick={() => setView("cards")} aria-label="Card view" aria-pressed={view === "cards"}>
              <LayoutGrid />
            </Button>
          </div>
        }
      />
      <Segmented
        className="mb-4 max-w-full overflow-x-auto whitespace-nowrap"
        aria-label="Filter projects"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All", count: mine.length },
          { value: "attention", label: "Needs attention", count: mine.filter(attention).length },
          { value: "sourcing", label: "Needs a doer", count: mine.filter(isSourcing).length },
          { value: "working", label: "Working", count: mine.filter(isUnderway).length },
          { value: "qc", label: "Quality check", count: mine.filter(isQc).length },
          { value: "delivered", label: "With client", count: mine.filter((p) => p.status === "delivered").length },
        ]}
      />
      {view === "cards" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((p) => (
            <ProjectCard key={p.id} p={p} to={p.status === "in_review" ? `/qc/${p.id}` : `/projects/${p.id}`} />
          ))}
        </div>
      ) : (
        <Panel padded={false}>
          <QueueTable
            caption="My projects"
            rows={isLoading ? undefined : rows}
            loading={isLoading}
            error={error}
            onRetry={() => void refetch()}
            rowKey={(p) => p.id}
            href={(p) => (p.status === "in_review" ? `/qc/${p.id}` : `/projects/${p.id}`)}
            rowClassName={(p) => (openFlags(p).length ? "bg-danger-bg/30" : undefined)}
            empty={{ icon: <FolderKanban />, title: "No projects in this view", body: "QQD assigns paid projects to you." }}
            columns={[
              { key: "project", header: "Project", cell: (p) => <ProjectCell p={p} />, sort: (p) => p.code },
              { key: "status", header: "Stage", cell: (p) => <StageCell p={p} />, width: "200px" },
              {
                key: "doer",
                header: "Doer",
                width: "150px",
                cell: (p) => {
                  const d = p.doers.filter(isActiveDoer);
                  if (p.self_assigned) return <span className="text-xs font-semibold">You</span>;
                  if (!d.length) return <span className="text-xs text-ink-3">{p.doers.some((x) => x.status === "offered") ? "Offer open" : "None yet"}</span>;
                  return <span className="font-mono text-xs font-semibold">{d.map((x) => x.doer_code).join(", ")}</span>;
                },
              },
              {
                key: "progress",
                header: "Progress",
                width: "170px",
                cell: (p) =>
                  hasActiveDoer(p) ? (
                    <div>
                      <div className="mb-1 flex justify-between text-[11.5px]"><span className="truncate text-ink-3">{p.progress_label ?? "Not started"}</span><b className="tabular">{p.progress_percent ?? 0}%</b></div>
                      <ProgressBar value={p.progress_percent} />
                    </div>
                  ) : (
                    <span className="text-xs text-ink-3">Not started</span>
                  ),
              },
              { key: "deadline", header: "Deadline", width: "130px", cell: (p) => <SlaClock deadline={p.deadline_utc} warnWithin={24 * HOUR} />, sort: (p) => p.deadline_utc ?? "9" },
              { key: "updated", header: "Updated", width: "110px", cell: (p) => <Ago at={p.updated_at} />, sort: (p) => p.updated_at },
            ]}
          />
        </Panel>
      )}
    </>
  );
}

function StageCell({ p }: { p: Project }) {
  const label = needsWorkingLink(p) ? "Working link needed" : isSourcing(p) ? (p.doers.some((d) => d.status === "offered") ? "Offer out" : "Needs a doer") : null;
  return (
    <div className="flex flex-col items-start gap-1">
      <StatusPill status={p.status} />
      {label ? <span className={cn("text-[11.5px] font-semibold", needsWorkingLink(p) ? "text-warning-ink" : "text-ink-3")}>{label}</span> : null}
    </div>
  );
}
