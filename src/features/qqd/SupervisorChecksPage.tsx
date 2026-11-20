import { useState } from "react";
import { UserCheck } from "lucide-react";
import { useAction, useApplications } from "@/api/hooks";
import * as api from "@/api/portal";
import { useMe } from "@/providers/SessionProvider";
import { EmptyState, PageHeader, Panel, Segmented } from "@/components/portal/kit";
import { CategoryBadge, Pill } from "@/components/portal/pills";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Textarea } from "@/components/ui/field";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { formatRelative } from "@/lib/datetime";
import type { SupervisorApplication } from "@/types/domain";

/** QQD verifies every supervisor account directly, with no delegation (FR-SV-014). */
export default function SupervisorChecksPage() {
  const { data, isLoading } = useApplications();
  const [view, setView] = useState<"pending" | "decided">("pending");
  const all = data ?? [];
  const rows = all.filter((a) => (view === "pending" ? a.status === "pending" : a.status !== "pending"));
  return (
    <>
      <PageHeader title="Supervisor checks" sub="New supervisors can't sign in until you approve them." />
      <Segmented
        className="mb-4"
        aria-label="Filter"
        value={view}
        onChange={setView}
        options={[
          { value: "pending", label: "Waiting", count: all.filter((a) => a.status === "pending").length },
          { value: "decided", label: "Decided", count: all.filter((a) => a.status !== "pending").length },
        ]}
      />
      {isLoading ? (
        <div className="skeleton h-48 rounded-2xl" />
      ) : rows.length === 0 ? (
        <Panel>
          <EmptyState icon={<UserCheck />} title={view === "pending" ? "No one waiting" : "Nothing decided yet"} />
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {rows.map((a) => (
            <ApplicationCard key={a.id} a={a} />
          ))}
        </div>
      )}
    </>
  );
}

function ApplicationCard({ a }: { a: SupervisorApplication }) {
  const me = useMe();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const checks = useAction((patch: { id_checked: boolean; interview_done: boolean }) => api.updateApplicationChecks(a.id, patch, me.id));
  const decide = useAction((approve: boolean) => api.decideSupervisorApplication(a.id, approve, reason, me.id), {
    success: (_r, approve) => (approve ? `${a.full_name} can now sign in as a supervisor.` : "Rejected."),
    onSuccess: () => setRejectOpen(false),
  });
  const pending = a.status === "pending";

  return (
    <section className="rounded-2xl border border-line-card bg-surface p-5 shadow-soft-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-[16px] font-bold">{a.full_name}</h2>
        <Pill tone={a.status === "approved" ? "success" : a.status === "rejected" ? "danger" : "warning"} className="ml-auto">
          {a.status === "pending" ? "Waiting" : a.status === "approved" ? "Approved" : "Rejected"}
        </Pill>
      </div>
      <p className="text-xs text-ink-3">
        {a.email} · {a.years_experience} years · applied {formatRelative(a.submitted_at)}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        {a.categories.map((c) => (
          <CategoryBadge key={c} category={c} short />
        ))}
      </div>
      <p className="mt-3 rounded-xl bg-surface-2 p-3 text-[13px] text-ink-2">{a.background}</p>

      {pending ? (
        <>
          <div className="mt-3 space-y-1">
            <Checkbox checked={a.id_checked} onChange={(v) => checks.mutate({ id_checked: v, interview_done: a.interview_done })} label="ID checked" />
            <Checkbox checked={a.interview_done} onChange={(v) => checks.mutate({ id_checked: a.id_checked, interview_done: v })} label="Interview done" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" disabled={!a.id_checked || !a.interview_done} loading={decide.isPending && decide.variables === true} onClick={() => decide.mutate(true)}>
              Approve
            </Button>
            <Button variant="ghost" onClick={() => setRejectOpen(true)}>
              Reject
            </Button>
          </div>
          {!a.id_checked || !a.interview_done ? <p className="mt-2 text-xs text-ink-3">Check their ID and finish the interview before approving.</p> : null}
        </>
      ) : (
        <p className="mt-3 text-[13px] text-ink-muted">
          {a.status === "approved" ? "Approved" : "Rejected"} by {a.decided_by}
          {a.reason ? `: ${a.reason}` : "."}
        </p>
      )}

      {rejectOpen ? (
        <Dialog open onOpenChange={setRejectOpen}>
          <DialogContent
            title={`Reject ${a.full_name}`}
            footer={
              <>
                <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancel</Button>
                <Button variant="danger" disabled={reason.trim().length < 10} loading={decide.isPending} onClick={() => decide.mutate(false)}>Reject</Button>
              </>
            }
          >
            <Field label="Reason" hint="They see this.">
              {({ id, describedBy }) => <Textarea id={id} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} aria-describedby={describedBy} autoFocus />}
            </Field>
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  );
}
