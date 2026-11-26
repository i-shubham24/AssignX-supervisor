import { useState } from "react";
import { useParams } from "react-router-dom";
import { AlertTriangle, Ban, CheckCircle2, ShieldAlert, Star } from "lucide-react";
import { useAction, useDoer, useDoerProjects } from "@/api/hooks";
import * as api from "@/api/portal";
import { useMe } from "@/providers/SessionProvider";
import { ErrorState, KeyValue, PageHeader, Panel } from "@/components/portal/kit";
import { QueueTable } from "@/components/portal/QueueTable";
import { CategoryBadge, Code, Pill, StatusPill } from "@/components/portal/pills";
import { RingGauge } from "@/components/portal/charts";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Select } from "@/components/ui/select";
import { Ago, ProjectCell } from "@/features/projects/cells";
import { DOER_CONCURRENCY_CAP, LEVEL_CUT } from "@/lib/config";
import { formatDate, formatRelative } from "@/lib/datetime";
import { formatInr } from "@/lib/money";
import type { DoerConductEntry, DoerLevel } from "@/types/domain";

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
  const me = useMe();
  const doer = useDoer(id);
  const projects = useDoerProjects(id);
  const [conductModal, setConductModal] = useState<DoerConductEntry["action"] | null>(null);
  const [conductReason, setConductReason] = useState("");
  const [targetLevel, setTargetLevel] = useState<DoerLevel>(1);

  const act = useAction(
    (vars: { action: DoerConductEntry["action"]; level?: DoerLevel; reason: string }) =>
      api.conductDoerAction(id, vars, me.id),
    {
      success: (_r, vars) => `Updated doer standing (${vars.action.replace(/_/g, " ")}).`,
      onSuccess: () => {
        setConductModal(null);
        setConductReason("");
      },
    },
  );

  if (doer.error) return <ErrorState error={doer.error} onRetry={() => void doer.refetch()} />;
  const d = doer.data;
  if (!d) return <div className="skeleton h-96 rounded-2xl" aria-busy="true" />;

  const ratingFlag = d.review_flagged || ((d.average_rating ?? 5) < 4 && d.projects_completed > 0);
  const demotionRisk = (d.average_rating ?? 5) < 3.5 && d.projects_completed >= 5;
  const isQqd = me.segment === "qqd";

  return (
    <>
      <PageHeader
        back={{ to: "/doers", label: "Doers" }}
        eyebrow={
          <>
            <Code>{d.doer_code}</Code>
            <Pill tone={d.verification_status === "verified" ? "success" : "warning"}>{d.verification_status}</Pill>
            <Pill tone={d.status === "active" ? "neutral" : "danger"}>{d.status}</Pill>
            <Pill tone="neutral">{d.availability}</Pill>
          </>
        }
        title={d.full_name}
        sub={`${d.sub_categories.join(", ")}. Joined ${formatDate(d.joined_at)}, active ${formatRelative(d.last_active_at)}.`}
        actions={
          isQqd ? (
            <div className="flex flex-wrap gap-2">
              {ratingFlag ? (
                <Button size="sm" variant="outline" loading={act.isPending} onClick={() => act.mutate({ action: "review_cleared", reason: "Review completed by QQD" })}>
                  <CheckCircle2 /> Clear review
                </Button>
              ) : null}
              <Button size="sm" variant="outline" onClick={() => setConductModal("warning")}>
                <AlertTriangle /> Warn
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setTargetLevel(d.level); setConductModal(d.level > 1 ? "demoted" : "promoted"); }}>
                Adjust level
              </Button>
              {d.status === "suspended" ? (
                <Button size="sm" variant="success" onClick={() => setConductModal("restored")}>Restore</Button>
              ) : d.status === "active" ? (
                <Button size="sm" variant="danger-soft" onClick={() => setConductModal("suspended")}>Suspend</Button>
              ) : null}
              {d.status !== "removed" ? (
                <Button size="sm" variant="danger" onClick={() => setConductModal("removed")}>
                  <Ban /> Remove & blacklist
                </Button>
              ) : null}
            </div>
          ) : null
        }
      />
      <div className="grid w-full max-w-full min-w-0 grid-cols-1 gap-5 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-4">
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
                { k: "Warnings", v: d.warning_count ?? 0 },
                { k: "Status", v: d.status },
              ]}
            />
            <div className="mt-4 flex flex-wrap gap-1">{d.fields.map((f) => <CategoryBadge key={f} category={f} />)}</div>
            {ratingFlag ? (
              <p className="mt-4 rounded-xl bg-warning-bg p-3 text-xs font-semibold text-warning-ink">
                {demotionRisk ? "Rating below 3.5: demotion review required (PRD 10.6)." : "Rating below 4.0. Flagged for review and cannot level up."}
              </p>
            ) : null}
            {d.status === "removed" ? (
              <p className="mt-4 rounded-xl bg-danger-bg p-3 text-xs font-semibold text-danger-ink">
                Removed and PAN-hash blacklisted. Cleared payouts remain payable separately (BR-037).
              </p>
            ) : null}
          </Panel>

          {(d.conduct_log ?? []).length ? (
            <Panel title="Conduct & review log">
              <ul className="space-y-2.5 text-xs">
                {(d.conduct_log ?? []).map((entry) => (
                  <li key={entry.id} className="rounded-lg border border-line-card bg-surface-2 p-2.5">
                    <div className="flex items-center justify-between gap-2 font-bold text-ink">
                      <span className="flex items-center gap-1 capitalize"><ShieldAlert className="h-3.5 w-3.5 text-warning-ink" />{entry.action.replace(/_/g, " ")}</span>
                      <span className="text-[11px] font-normal text-ink-3">{formatRelative(entry.created_at)}</span>
                    </div>
                    <p className="mt-1 text-ink-2">{entry.reason}</p>
                    <p className="mt-0.5 text-[11px] text-ink-3">By {entry.actor_label}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>

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

      {conductModal ? (
        <Dialog open onOpenChange={(o) => !o && setConductModal(null)}>
          <DialogContent
            title={`Doer action: ${conductModal.replace(/_/g, " ")}`}
            description={`${d.doer_code} (${d.full_name})`}
            footer={
              <>
                <Button variant="ghost" onClick={() => setConductModal(null)}>Cancel</Button>
                <Button
                  variant={conductModal === "removed" || conductModal === "suspended" ? "danger" : "primary"}
                  loading={act.isPending}
                  disabled={conductReason.trim().length < 10}
                  onClick={() => act.mutate({ action: conductModal, level: targetLevel, reason: conductReason })}
                >
                  Confirm
                </Button>
              </>
            }
          >
            <div className="space-y-4">
              {conductModal === "demoted" || conductModal === "promoted" ? (
                <Field label="Target level">
                  {({ id }) => (
                    <Select
                      id={id}
                      value={String(targetLevel)}
                      onChange={(v) => {
                        const lvl = Number(v) as DoerLevel;
                        setTargetLevel(lvl);
                        setConductModal(lvl < d.level ? "demoted" : "promoted");
                      }}
                      options={[
                        { value: "1", label: "Level 1 (35% guide)" },
                        { value: "2", label: "Level 2 (45% guide)" },
                        { value: "3", label: "Level 3 (55% guide)" },
                      ]}
                    />
                  )}
                </Field>
              ) : null}
              <Field label="Audit reason" required hint="Minimum 10 characters. Logged permanently.">
                {({ id, describedBy }) => <Textarea id={id} rows={4} value={conductReason} onChange={(e) => setConductReason(e.target.value)} aria-describedby={describedBy} autoFocus />}
              </Field>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
