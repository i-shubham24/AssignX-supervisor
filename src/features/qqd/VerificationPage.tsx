import { useState } from "react";
import { BadgeCheck, FileText } from "lucide-react";
import { useAction, useOperators, useVerification } from "@/api/hooks";
import * as api from "@/api/portal";
import { useMe } from "@/providers/SessionProvider";
import { EmptyState, PageHeader, Panel, Segmented } from "@/components/portal/kit";
import { CategoryBadge, Code, Pill } from "@/components/portal/pills";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Textarea } from "@/components/ui/field";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Select } from "@/components/ui/select";
import { formatRelative } from "@/lib/datetime";
import type { VerificationCase } from "@/types/domain";

const STAGE: Record<VerificationCase["stage"], { label: string; tone: React.ComponentProps<typeof Pill>["tone"] }> = {
  document_check: { label: "Document check", tone: "warning" },
  awaiting_supervisor: { label: "Needs a supervisor", tone: "info" },
  supervisor_call: { label: "Supervisor call", tone: "violet" },
  verified: { label: "Verified", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

/**
 * Doer document review and onboarding assignment (PRD 6.2, 11.1). QQD confirms the
 * documents and payout name, then assigns a supervisor to speak with the doer.
 * Documents are encrypted; the PAN is hashed after verification.
 */
export default function VerificationPage() {
  const { data, isLoading } = useVerification();
  const [stage, setStage] = useState<"open" | "all">("open");
  const rows = (data ?? []).filter((v) => stage === "all" || v.stage === "document_check" || v.stage === "awaiting_supervisor" || v.stage === "supervisor_call");
  return (
    <>
      <PageHeader title="Doer checks" sub="Doer documents to check." />
      <Segmented className="mb-4" aria-label="Filter" value={stage} onChange={setStage} options={[{ value: "open", label: "Open", count: (data ?? []).filter((v) => v.stage !== "verified" && v.stage !== "rejected").length }, { value: "all", label: "All", count: (data ?? []).length }]} />
      {isLoading ? (
        <div className="skeleton h-56 rounded-2xl" />
      ) : rows.length === 0 ? (
        <Panel><EmptyState icon={<BadgeCheck />} title="Nothing to verify" /></Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{rows.map((v) => <VerificationCard key={v.id} v={v} />)}</div>
      )}
    </>
  );
}

function VerificationCard({ v }: { v: VerificationCase }) {
  const me = useMe();
  const supervisors = (useOperators().data ?? []).filter((o) => o.segment === "supervisor");
  const [docs, setDocs] = useState(v.documents);
  const [payoutOk, setPayoutOk] = useState(Boolean(v.payout_name_matches));
  const [sup, setSup] = useState<string | null>(supervisors.find((s) => s.categories.some((c) => v.fields.includes(c)))?.id ?? null);
  const save = useAction(() => api.recordDocumentCheck(v.id, { documents: docs, payout_name_matches: payoutOk }, me.id), { success: "Document check saved." });
  const assign = useAction(async () => {
    await api.recordDocumentCheck(v.id, { documents: docs, payout_name_matches: payoutOk }, me.id);
    return api.assignOnboarding(v.id, sup ?? "", me.id);
  }, { success: "Assigned for onboarding." });
  const editable = v.stage === "document_check" || v.stage === "awaiting_supervisor";
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const reject = useAction(() => api.decideVerification(v.id, false, reason, me.id), { success: "Rejected. The doer sees your reason and can upload again.", onSuccess: () => setRejectOpen(false) });

  return (
    <section className="rounded-2xl border border-line-card bg-surface p-5 shadow-soft-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Code>{v.doer_code}</Code>
        {v.fields.map((f) => <CategoryBadge key={f} category={f} short />)}
        <Pill tone={STAGE[v.stage].tone} className="ml-auto">{STAGE[v.stage].label}</Pill>
      </div>
      <h3 className="mt-2 text-[16px] font-bold">{v.full_name}</h3>
      <p className="text-xs text-ink-3">Declared name {v.declared_name}. Submitted {formatRelative(v.submitted_at)}.</p>
      {v.rejection_reason ? <p className="mt-3 rounded-xl bg-danger-bg p-3 text-xs text-danger-ink">{v.rejection_reason}</p> : null}
      <div className="mt-4 space-y-2">
        {docs.map((d, i) => (
          <div key={d.kind} className="rounded-xl border border-line-card p-3">
            <div className="mb-1 flex items-center gap-2 text-[13px] font-bold"><FileText className="h-4 w-4 text-ink-3" aria-hidden="true" />{d.label}<span className="ml-auto text-[11px] font-medium text-ink-3">Encrypted</span></div>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <Checkbox disabled={!editable} checked={Boolean(d.legible)} onChange={(val) => setDocs((x) => x.map((y, j) => (j === i ? { ...y, legible: val } : y)))} label="Legible and valid" />
              <Checkbox disabled={!editable} checked={Boolean(d.name_matches)} onChange={(val) => setDocs((x) => x.map((y, j) => (j === i ? { ...y, name_matches: val } : y)))} label="Name matches" />
            </div>
          </div>
        ))}
        <Checkbox disabled={!editable} checked={payoutOk} onChange={setPayoutOk} label={`Payout details done and name matches (${v.payout_method ?? "not set"})`} />
      </div>
      {editable ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Select className="w-full sm:w-56" aria-label="Onboarding supervisor" value={sup} onChange={setSup} placeholder="Onboarding supervisor" options={supervisors.map((s) => ({ value: s.id, label: s.full_name, hint: s.categories.join(", ") }))} />
          <Button variant="primary" disabled={!sup || docs.some((d) => !d.legible || !d.name_matches) || !payoutOk} loading={assign.isPending} onClick={() => assign.mutate(undefined)}>Assign for onboarding</Button>
          <Button variant="ghost" loading={save.isPending} onClick={() => save.mutate(undefined)}>Save check</Button>
          <Button variant="danger-soft" className="sm:ml-auto" onClick={() => setRejectOpen(true)}>Reject</Button>
        </div>
      ) : v.stage === "supervisor_call" ? (
        <p className="mt-4 text-[13px] text-ink-muted">With {supervisors.find((s) => s.id === v.assigned_supervisor_id)?.full_name ?? "a supervisor"} for the identity call.</p>
      ) : null}
      {rejectOpen ? (
        <Dialog open onOpenChange={setRejectOpen}>
          <DialogContent
            title={`Reject ${v.doer_code}'s documents`}
            footer={
              <>
                <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancel</Button>
                <Button variant="danger" disabled={reason.trim().length < 10} loading={reject.isPending} onClick={() => reject.mutate(undefined)}>Reject</Button>
              </>
            }
          >
            <Field label="What's wrong and how to fix it" hint="The doer sees this.">
              {({ id, describedBy }) => <Textarea id={id} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} aria-describedby={describedBy} placeholder="For example: the PAN photo is blurry. Upload a clear photo of the whole card." autoFocus />}
            </Field>
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  );
}
