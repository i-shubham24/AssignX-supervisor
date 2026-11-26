import { useState } from "react";
import { BadgeCheck, Check, Eye, FileText, Phone, X } from "lucide-react";
import { useAction, useVerification } from "@/api/hooks";
import * as api from "@/api/portal";
import { useMe } from "@/providers/SessionProvider";
import { AttachmentPreviewDialog, type PreviewTarget } from "@/components/portal/AttachmentPreviewDialog";
import { EmptyState, PageHeader, Panel } from "@/components/portal/kit";
import { CategoryBadge, Code, Pill } from "@/components/portal/pills";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Textarea } from "@/components/ui/field";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { formatRelative } from "@/lib/datetime";
import type { VerificationCase } from "@/types/domain";

/**
 * New doers QQD assigned for identity confirmation (PRD 6.2 steps 8 to 10).
 * Verification is a prompt for the doer, never a wall, so this queue should move fast.
 */
export default function OnboardingPage() {
  const me = useMe();
  const { data, isLoading } = useVerification();
  const mine = (data ?? []).filter((v) => v.assigned_supervisor_id === me.id);
  const open = mine.filter((v) => v.stage === "supervisor_call");
  const done = mine.filter((v) => v.stage === "verified" || v.stage === "rejected");

  return (
    <>
      <PageHeader title="New doers" sub="Call each new doer, check their ID, then verify." />
      {isLoading ? (
        <div className="skeleton h-48 rounded-2xl" />
      ) : open.length === 0 ? (
        <Panel><EmptyState icon={<BadgeCheck />} title="No calls waiting" body="QQD sends new doers here after the document check." /></Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {open.map((v) => <CaseCard key={v.id} v={v} />)}
        </div>
      )}
      {done.length ? (
        <Panel className="mt-6" title="Recent decisions" padded={false}>
          <ul className="divide-y divide-line-subtle">
            {done.map((v) => (
              <li key={v.id} className="flex items-center gap-3 px-4 py-3">
                <Code>{v.doer_code}</Code>
                <span className="flex-1 text-[13px] font-semibold">{v.full_name}</span>
                <Pill tone={v.stage === "verified" ? "success" : "danger"}>{v.stage}</Pill>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </>
  );
}

function CaseCard({ v }: { v: VerificationCase }) {
  const me = useMe();
  const [called, setCalled] = useState(false);
  const [identity, setIdentity] = useState(false);
  const [terms, setTerms] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<PreviewTarget | null>(null);
  const decide = useAction((approve: boolean) => api.decideVerification(v.id, approve, reason, me.id), {
    success: (_r, approve) => (approve ? `${v.doer_code} verified at Level 1.` : "Rejected. The doer will see your reason."),
  });

  return (
    <section className="rounded-2xl border border-line-card bg-surface p-5 shadow-soft-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Code>{v.doer_code}</Code>
        {v.fields.map((f) => <CategoryBadge key={f} category={f} short />)}
        <span className="ml-auto text-xs text-ink-3">Submitted {formatRelative(v.submitted_at)}</span>
      </div>
      <h3 className="mt-2 text-[16px] font-bold">{v.full_name}</h3>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {v.documents.map((d) => (
          <div key={d.kind} className="flex items-center gap-2 rounded-xl border border-line-card bg-surface-2 px-3 py-2 text-[12.5px]">
            <FileText className="h-4 w-4 text-ink-3" aria-hidden="true" />
            <span className="flex-1 font-semibold">{d.label}</span>
            <button
              type="button"
              onClick={() =>
                setPreview({
                  id: `${v.id}-${d.kind}`,
                  filename: `${v.doer_code.toLowerCase()}-${d.kind}.pdf`,
                  mime_type: "application/pdf",
                  download_url: d.download_url ?? null,
                  subtitle: `Identity document for ${v.doer_code} (Supervisor onboarding call)`,
                  demoLines: [
                    `Document type: ${d.label}`,
                    `Applicant: ${v.full_name}`,
                    `Declared name: ${v.declared_name}`,
                    `QQD legible check: ${d.legible ? "Passed" : "Pending"}`,
                    `QQD name match: ${d.name_matches ? "Confirmed" : "Pending"}`,
                  ],
                })
              }
              className="rounded-md p-1 text-ink-3 hover:bg-hover hover:text-ink"
              aria-label={`View ${d.label}`}
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
            {d.legible && d.name_matches ? <Check className="h-4 w-4 text-success-ink" aria-label="Checked by QQD" /> : <X className="h-4 w-4 text-danger-ink" aria-label="Not confirmed" />}
          </div>
        ))}
      </div>
      <AttachmentPreviewDialog item={preview} open={Boolean(preview)} onOpenChange={(o) => !o && setPreview(null)} />
      <p className="mt-2 text-xs text-ink-3">Payout by {v.payout_method ?? "not set"}, account name {v.payout_name_matches ? "matches" : "not confirmed"}.</p>
      <div className="mt-4 space-y-1 rounded-xl border border-line-card p-3">
        <Checkbox checked={called} onChange={setCalled} label="Spoke with the doer" description="Video or voice, on the company line" />
        <Checkbox checked={identity} onChange={setIdentity} label="Identity matches the documents" />
        <Checkbox checked={terms} onChange={setTerms} label="Explained anonymity, workspaces and IP terms" />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" disabled={!called || !identity || !terms} loading={decide.isPending && decide.variables === true} onClick={() => decide.mutate(true)}>
          <BadgeCheck /> Verify at Level 1
        </Button>
        <Button variant="ghost" onClick={() => setRejectOpen(true)}><Phone /> Reject</Button>
      </div>
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent
          title={`Reject ${v.doer_code}`}
          description="The doer will see this."
          footer={<><Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancel</Button><Button variant="danger" disabled={reason.trim().length < 10} loading={decide.isPending} onClick={() => decide.mutate(false)}>Reject</Button></>}
        >
          <Field label="Reason and how to fix it" required>{({ id }) => <Textarea id={id} value={reason} onChange={(e) => setReason(e.target.value)} rows={4} autoFocus />}</Field>
        </DialogContent>
      </Dialog>
    </section>
  );
}
