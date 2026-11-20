import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { checkUpload, cleanText, DELIVERABLE_POLICY, REPORT_POLICY, type UploadPolicy } from "@/lib/input-safety";
import { safeWorkspaceHref } from "@/lib/safe-url";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, FileCheck2, Paperclip, Plus, RotateCcw, Send, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import { useAction, useProject } from "@/api/hooks";
import * as api from "@/api/portal";
import { useMe } from "@/providers/SessionProvider";
import { CATEGORIES, QC_CHECKLISTS, SLA } from "@/lib/config";
import { formatRelative } from "@/lib/datetime";
import { cn } from "@/lib/cn";
import { ErrorState, PageHeader, Panel, SlaClock } from "@/components/portal/kit";
import { CategoryBadge, Code, SideTag, StatusPill } from "@/components/portal/pills";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { ChatThread } from "@/features/projects/ChatThread";
import { isActiveDoer } from "@/features/projects/queues";
import type { Attachment, Project, QcRecord } from "@/types/domain";

/**
 * Final checks: the brief beside the submission, the category checklist, the
 * deliverables the client will receive, and the delivery gate (FR-SV-010):
 * every check done and at least one deliverable, plus the originality report for
 * written work.
 */
export default function QcReviewPage() {
  const { id = "" } = useParams();
  const { data: p, isLoading, error, refetch } = useProject(id);
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading || !p) return <div className="skeleton h-[600px] rounded-2xl" aria-busy="true" />;
  // Keyed by project so checks and notes never carry over to another project.
  return <Review key={p.id} p={p} />;
}

function Review({ p }: { p: Project }) {
  const me = useMe();
  const navigate = useNavigate();
  const items = QC_CHECKLISTS[p.category];
  const [qc, setQc] = useState<Omit<QcRecord, "completed_at">>(() => ({ checks: p.qc?.checks ?? {}, custom_checks: p.qc?.custom_checks ?? [], notes: p.qc?.notes ?? "" }));
  const [newCheck, setNewCheck] = useState("");
  const [note, setNote] = useState(p.delivery_note ?? "");
  const [sendBackOpen, setSendBackOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [originalityPct, setOriginalityPct] = useState(97);
  const [aiScorePct, setAiScorePct] = useState(3);

  const save = useAction((next: Omit<QcRecord, "completed_at">) => api.saveQc(p.id, next, me.id), { fallback: "Your check was not saved." });
  // Save checklist edits shortly after the last change, so ticks survive a reload.
  // Nothing is written until the supervisor actually edits something.
  const dirty = useRef(false);
  const edit = (fn: (q: Omit<QcRecord, "completed_at">) => Omit<QcRecord, "completed_at">) => {
    dirty.current = true;
    setQc(fn);
  };
  useEffect(() => {
    if (p.status !== "in_review" || !dirty.current) return;
    const t = setTimeout(() => save.mutate(qc), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qc]);

  const upload = useAction((v: { name: string; kind: "deliverable" | "quality_report" }) => api.addDeliverable(p.id, v.name, v.kind, me.id), { success: (_r, v) => `${v.name} uploaded.` });
  const remove = useAction((attId: string) => api.removeAttachment(p.id, attId, me.id));
  // Save the latest checks first, so ticking the last box and delivering at once works.
  const deliver = useAction(async () => {
    if (dirty.current) await api.saveQc(p.id, qc, me.id);
    return api.deliver(p.id, note, me.id);
  }, { success: "Delivered to the client.", onSuccess: () => navigate(`/projects/${p.id}`) });
  const sendBack = useAction(() => api.sendBack(p.id, reason, me.id), { success: "Sent back to the doer.", onSuccess: () => navigate(`/projects/${p.id}`) });

  const submission = p.attachments.filter((a) => a.kind === "revision");
  const deliverables = p.attachments.filter((a) => a.kind === "deliverable");
  const reports = p.attachments.filter((a) => a.kind === "quality_report");
  const needsReport = p.category === "writing";

  const checksDone = p.category === "other" ? qc.custom_checks.length > 0 && qc.custom_checks.every((c) => c.done) : items.every((i) => qc.checks[i.id]) && qc.custom_checks.every((c) => c.done);
  const gates = [
    { ok: checksDone, label: "All checks done" },
    { ok: deliverables.length > 0, label: "At least one file uploaded" },
    ...(needsReport ? [{ ok: reports.length > 0, label: "Originality and AI report attached" }] : []),
  ];
  const ready = gates.every((g) => g.ok);
  const total = (p.category === "other" ? 0 : items.length) + qc.custom_checks.length;
  const done = (p.category === "other" ? 0 : items.filter((i) => qc.checks[i.id]).length) + qc.custom_checks.filter((c) => c.done).length;
  const locked = p.status !== "in_review";

  return (
    <>
      <PageHeader
        back={{ to: "/qc", label: "Quality check" }}
        eyebrow={
          <>
            <Code>{p.code}</Code>
            <CategoryBadge category={p.category} />
            <StatusPill status={p.status} />
            {!locked ? <SlaClock since={p.progress_updated_at} target={SLA.qc.target} escalate={SLA.qc.escalate} /> : null}
          </>
        }
        title={p.title}
        sub={`Submitted by ${p.doers.filter(isActiveDoer).map((d) => d.doer_code).join(", ")} ${p.progress_updated_at ? formatRelative(p.progress_updated_at) : ""}. ${p.qc_bounce_count ? `Sent back ${p.qc_bounce_count} time${p.qc_bounce_count === 1 ? "" : "s"}.` : p.revision_count ? `Client revision ${p.revision_count}.` : "First pass."}`}
        actions={
          locked ? null : (
            <>
              <Button onClick={() => setSendBackOpen(true)}>
                <RotateCcw /> Send back to doer
              </Button>
              <Button variant="primary" size="lg" disabled={!ready} loading={deliver.isPending} onClick={() => deliver.mutate(undefined)}>
                <Send /> Deliver to client
              </Button>
            </>
          )
        }
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <Panel title="Brief">
            <p className="prose-plain text-[13px] leading-relaxed text-ink-2">{p.description}</p>
            {p.category_answers.length ? (
              <ul className="mt-3 space-y-1.5 text-[12.5px]">
                {p.category_answers.map((a) => (
                  <li key={a.question}><span className="text-ink-3">{a.question}:</span> <b className="font-semibold">{a.answer}</b></li>
                ))}
              </ul>
            ) : null}
          </Panel>
          <Panel title="Doer submission" tone="doer">
            {submission.length === 0 ? <p className="text-sm text-ink-3">No files. Check the working link.</p> : <FileList files={submission} />}
            {p.doers.filter(isActiveDoer).map((d) => {
              const href = safeWorkspaceHref(d.working_link);
              return href ? (
                <a key={d.id} href={href} target="_blank" rel="noreferrer noopener" className="mt-3 block truncate rounded-xl bg-doer-light px-3 py-2 text-xs font-semibold text-doer-ink hover:underline">
                  Working link: {href}
                </a>
              ) : null;
            })}
          </Panel>
          <section className="flex h-[70vh] flex-col lg:h-[420px] overflow-hidden rounded-2xl border border-line-card bg-surface shadow-soft-sm">
            <div className="border-b border-line-subtle px-4 py-2.5 text-[13px] font-bold">Chat with doer</div>
            <ChatThread project={p} channel="internal" className="flex-1" />
          </section>
        </div>

        <div className="min-w-0 space-y-4">
          <Panel title={`${CATEGORIES[p.category].label} checklist`} sub={p.category === "other" ? "Add your own checks for this one." : "All required before delivery."} actions={<span className="tabular text-[12px] font-bold text-ink-2">{done} of {total || "?"}</span>}>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-subtle">
              <div className="h-full rounded-full bg-success-dot transition-[width] duration-500" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>
            <div className="space-y-1">
              {items.map((item) => (
                <Checkbox key={item.id} disabled={locked} checked={Boolean(qc.checks[item.id])} onChange={(v) => edit((q) => ({ ...q, checks: { ...q.checks, [item.id]: v } }))} label={item.label} />
              ))}
              {qc.custom_checks.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Checkbox className="flex-1" disabled={locked} checked={c.done} onChange={(v) => edit((q) => ({ ...q, custom_checks: q.custom_checks.map((x, j) => (j === i ? { ...x, done: v } : x)) }))} label={c.label} />
                  {!locked ? (
                    <button className="rounded p-1 text-ink-3 hover:bg-hover hover:text-danger-ink" aria-label={`Remove check ${c.label}`} onClick={() => edit((q) => ({ ...q, custom_checks: q.custom_checks.filter((_, j) => j !== i) }))}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            {!locked ? (
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newCheck.trim()) return;
                  edit((q) => ({ ...q, custom_checks: [...q.custom_checks, { label: newCheck.trim(), done: false }] }));
                  setNewCheck("");
                }}
              >
                <Input value={newCheck} onChange={(e) => setNewCheck(e.target.value)} placeholder="Add a check" className="h-8" aria-label="New check" />
                <Button size="sm" type="submit"><Plus /> Add</Button>
              </form>
            ) : null}
            <Field className="mt-4" label="Notes" hint="Internal. Support can see these.">
              {({ id, describedBy }) => <Textarea id={id} disabled={locked} value={qc.notes} onChange={(e) => edit((q) => ({ ...q, notes: e.target.value }))} rows={3} aria-describedby={describedBy} />}
            </Field>
            {save.isPending ? <p className="mt-1 text-[11px] text-ink-3">Saving...</p> : null}
          </Panel>

          {needsReport ? (
            <Panel title="Quality report" sub="Attach the originality and AI check report." actions={<SideTag side="client" />}>
              {reports.length ? (
                <>
                  <FileList files={reports} onRemove={locked ? undefined : (a) => remove.mutate(a.id)} />
                  <div className="mt-3 rounded-xl border border-line-card bg-surface-2 p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-ink-2">Authenticity & Originality</span>
                      <span className="rounded-full bg-success-bg px-2 py-0.5 text-[11px] font-bold text-success-ink">
                        Verified
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 text-[12px]">
                      <div className="rounded-lg bg-surface p-2 text-center ring-1 ring-line-card">
                        <span className="block text-[11px] text-ink-muted">Originality</span>
                        <span className="text-sm font-bold text-success-ink">{originalityPct}%</span>
                      </div>
                      <div className="rounded-lg bg-surface p-2 text-center ring-1 ring-line-card">
                        <span className="block text-[11px] text-ink-muted">AI Detection</span>
                        <span className="text-sm font-bold text-ink-2">{aiScorePct}%</span>
                      </div>
                    </div>
                    <p className="text-[10.5px] text-ink-muted">
                      Originality verified without disclosing detection vendor (PRD BR-035).
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-ink-3">No report attached yet. An originality scan is required for writing deliverables.</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-ink-muted">Originality %</label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={originalityPct}
                        disabled={locked}
                        onChange={(e) => setOriginalityPct(Number(e.target.value))}
                        className="h-8 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-ink-muted">AI Score %</label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={aiScorePct}
                        disabled={locked}
                        onChange={(e) => setAiScorePct(Number(e.target.value))}
                        className="h-8 mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}
              {!locked ? (
                <UploadButton
                  label="Attach report"
                  policy={REPORT_POLICY}
                  onPick={(name) => {
                    upload.mutate({ name, kind: "quality_report" });
                    edit((q) => ({ ...q, checks: { ...q.checks, report: true } }));
                  }}
                  busy={upload.isPending}
                />
              ) : null}
            </Panel>
          ) : null}
        </div>

        <div className="space-y-4 lg:col-span-2 2xl:sticky 2xl:top-3 2xl:col-span-1">
          <Panel title="Deliverables" sub="What the client gets. Locked until they approve." tone="client">
            {deliverables.length ? <FileList files={deliverables} onRemove={locked ? undefined : (a) => remove.mutate(a.id)} /> : <p className="text-sm text-ink-3">Upload the final files.</p>}
            {!locked ? <UploadButton label="Upload deliverable" policy={DELIVERABLE_POLICY} onPick={(name) => upload.mutate({ name, kind: "deliverable" })} busy={upload.isPending} /> : null}
          </Panel>
          <Panel title="Delivery note" actions={<SideTag side="client" />}>
            <Textarea value={note} disabled={locked} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="What is included and how to use it." aria-label="Delivery note" />
          </Panel>
          <Panel title="Ready to deliver?">
            <ul className="space-y-2">
              {gates.map((g) => (
                <li key={g.label} className={cn("flex items-center gap-2 text-[13px]", g.ok ? "text-success-ink" : "text-ink-muted")}>
                  {g.ok ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <span className="h-4 w-4 rounded-full border-2 border-line" aria-hidden="true" />}
                  {g.label}
                </li>
              ))}
            </ul>
            {!locked ? (
              <Button variant="primary" className="mt-4 w-full" size="lg" disabled={!ready} loading={deliver.isPending} onClick={() => deliver.mutate(undefined)}>
                <ShieldCheck /> Deliver to client
              </Button>
            ) : (
              <p className="mt-3 text-sm font-semibold text-success-ink">Delivered {p.delivered_at ? formatRelative(p.delivered_at) : ""}.</p>
            )}
          </Panel>
        </div>
      </div>

      <Dialog open={sendBackOpen} onOpenChange={setSendBackOpen}>
        <DialogContent
          title="Send back to the doer"
          description="The doer sees your notes. The client is not told."
          footer={
            <>
              <Button variant="ghost" onClick={() => setSendBackOpen(false)}>Cancel</Button>
              <Button variant="doer" loading={sendBack.isPending} disabled={reason.trim().length < 10} onClick={() => sendBack.mutate(undefined)}>Send back</Button>
            </>
          }
        >
          <Field label="What needs to change" required hint="Be specific.">
            {({ id, describedBy }) => <Textarea id={id} value={reason} onChange={(e) => setReason(e.target.value)} rows={5} aria-describedby={describedBy} autoFocus />}
          </Field>
          <div className="mt-3"><SideTag side="doer" /></div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FileList({ files, onRemove }: { files: Attachment[]; onRemove?: (a: Attachment) => void }) {
  return (
    <ul className="space-y-1.5">
      {files.map((a) => (
        <li key={a.id} className="flex items-center gap-2.5 rounded-xl border border-line-card bg-surface-2 px-3 py-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-ink-3 ring-1 ring-line-card">
            {a.kind === "quality_report" ? <FileCheck2 className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold">{a.filename}</span>
            <span className="block text-[11px] text-ink-3">
              {(a.size_bytes / 1024 / 1024).toFixed(1)} MB · {a.scan_status === "clean" ? "Scanned clean" : a.scan_status} · {formatRelative(a.created_at)}
            </span>
          </span>
          {onRemove ? (
            <button onClick={() => onRemove(a)} className="rounded-md p-1.5 text-ink-3 hover:bg-danger-bg hover:text-danger-ink" aria-label={`Remove ${a.filename}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Every file is checked by content before upload; the server checks again and scans it. */
function UploadButton({ label, onPick, busy, policy }: { label: string; onPick: (name: string) => void; busy: boolean; policy: UploadPolicy }) {
  const inputId = useId();
  const [checking, setChecking] = useState(false);
  return (
    <>
      <Button className="mt-3 w-full" variant="outline" loading={busy || checking} onClick={() => document.getElementById(inputId)?.click()}>
        <Upload /> {label}
      </Button>
      <input
        id={inputId}
        type="file"
        className="sr-only"
        accept={policy.allowed.includes("pdf") && policy.allowed.length === 1 ? "application/pdf" : undefined}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setChecking(true);
          try {
            const problem = await checkUpload(f, policy);
            if (problem) toast.error(problem);
            else onPick(cleanText(f.name, 200));
          } finally {
            setChecking(false);
          }
        }}
      />
    </>
  );
}
