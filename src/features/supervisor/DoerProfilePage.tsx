import { useParams } from "react-router-dom";
import { Star } from "lucide-react";
import { useDoer, useDoerProjects } from "@/api/hooks";
import { ErrorState, KeyValue, PageHeader, Panel } from "@/components/portal/kit";
import { QueueTable } from "@/components/portal/QueueTable";
import { CategoryBadge, Code, Pill, StatusPill } from "@/components/portal/pills";
import { RingGauge } from "@/components/portal/charts";
import { Ago, ProjectCell } from "@/features/projects/cells";
import { DOER_CONCURRENCY_CAP, LEVEL_CUT } from "@/lib/config";
import { formatDate, formatRelative } from "@/lib/datetime";
import { formatInr } from "@/lib/money";

/** Level thresholds (PRD 10.6): L2 at 10 projects and 4.0, L3 at 30 and 4.0. */
function nextLevel(level: 1 | 2 | 3, done: number, rating: number | null): string {
  if (level === 3) return "Top level reached.";
  const target = level === 1 ? 10 : 30;
  const left = Math.max(0, target - done);
  const ratingOk = (rating ?? 0) >= 4;
  return `${left} more project${left === 1 ? "" : "s"}${ratingOk ? "" : " and a 4.0 rating"} to reach Level ${level + 1}.`;
}

export default function DoerProfilePage() {
  const { id = "" } = useParams();
  const doer = useDoer(id);
  const projects = useDoerProjects(id);
  if (doer.error) return <ErrorState error={doer.error} onRetry={() => void doer.refetch()} />;
  const d = doer.data;
  if (!d) return <div className="skeleton h-96 rounded-2xl" aria-busy="true" />;

  return (
    <>
      <PageHeader
        back={{ to: "/doers", label: "Doers" }}
        eyebrow={<><Code>{d.doer_code}</Code><Pill tone={d.verification_status === "verified" ? "success" : "warning"}>{d.verification_status}</Pill><Pill tone="neutral">{d.availability}</Pill></>}
        title={d.full_name}
        sub={`${d.sub_categories.join(", ")}. Joined ${formatDate(d.joined_at)}, active ${formatRelative(d.last_active_at)}.`}
      />
      <div className="grid w-full max-w-full min-w-0 grid-cols-1 gap-5 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)]">
        <Panel>
          <div className="flex flex-col items-center text-center">
            <RingGauge value={d.level === 3 ? 100 : d.level === 2 ? Math.min(100, ((d.projects_completed - 10) / 20) * 100) : Math.min(100, (d.projects_completed / 10) * 100)} label={`L${d.level}`} sub={`${LEVEL_CUT[d.level]}% cut`} size={160} />
            <p className="mt-3 text-[13px] text-ink-muted">{nextLevel(d.level, d.projects_completed, d.average_rating)}</p>
          </div>
          <KeyValue
            className="mt-5"
            items={[
              { k: "Rating", v: <span className="flex items-center gap-1 font-semibold"><Star className="h-3.5 w-3.5 fill-warning-dot text-warning-dot" aria-hidden="true" />{d.average_rating?.toFixed(1) ?? "No ratings"}</span> },
              { k: "Completed", v: d.projects_completed },
              { k: "Active now", v: `${d.active_project_count} of ${DOER_CONCURRENCY_CAP}` },
              { k: "On time", v: d.on_time_rate !== null ? `${Math.round(d.on_time_rate * 100)}%` : "No history" },
              { k: "Experience", v: d.experience_tier },
              { k: "Status", v: d.status },
            ]}
          />
          <div className="mt-4 flex flex-wrap gap-1">{d.fields.map((f) => <CategoryBadge key={f} category={f} />)}</div>
          {(d.average_rating ?? 5) < 4 && d.projects_completed > 0 ? <p className="mt-4 rounded-xl bg-warning-bg p-3 text-xs font-semibold text-warning-ink">Rating below 4.0. Flagged for review and cannot level up.</p> : null}
        </Panel>
        <Panel title="Projects" padded={false}>
          <QueueTable
            caption="Doer projects"
            rows={projects.isLoading ? undefined : projects.data}
            loading={projects.isLoading}
            rowKey={(p) => p.id}
            href={(p) => `/projects/${p.id}`}
            empty={{ title: "No projects yet" }}
            columns={[
              { key: "p", header: "Project", cell: (p) => <ProjectCell p={p} /> },
              { key: "s", header: "Status", width: "140px", cell: (p) => <StatusPill status={p.status} /> },
              { key: "pay", header: "Payout", width: "120px", cell: (p) => <span className="tabular font-semibold">{formatInr(p.doers.find((x) => x.doer_id === d.id)?.payout_amount_inr ?? 0)}</span> },
              { key: "u", header: "Updated", width: "110px", cell: (p) => <Ago at={p.updated_at} /> },
            ]}
          />
        </Panel>
      </div>
    </>
  );
}
