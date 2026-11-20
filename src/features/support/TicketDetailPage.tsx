import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, Lock, ReceiptText, SendHorizontal } from "lucide-react";
import { useAction, useOperators, useProjects, useTicket } from "@/api/hooks";
import * as api from "@/api/portal";
import { useMe } from "@/providers/SessionProvider";
import { ErrorState, KeyValue, Money, PageHeader, Panel, SlaClock } from "@/components/portal/kit";
import { Code, Pill, SideTag, StatusPill } from "@/components/portal/pills";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { TICKET_CATEGORY, TICKET_PRIORITY, TICKET_STATUS } from "@/lib/config";
import { formatDateTime, formatRelative } from "@/lib/datetime";
import { parseMajorToMinor } from "@/lib/money";
import { cn } from "@/lib/cn";
import type { Ticket, TicketPriority, TicketStatus } from "@/types/domain";

const PATHS: Partial<Record<Ticket["category"], string>> = {
  quality_complaint: "Check the files, quality check and brief. Options: free revision, partial refund, full refund.",
  delay_complaint: "Check the timeline and updates. Options: speed up, partial refund, full refund.",
  billing: "Check the invoice, payment and credits. Fix and reissue if needed.",
  conduct: "Read both chats. Send to QQD for a warning, suspension or removal.",
  doer_issue: "Investigate here. QQD decides.",
  refund_request: "Investigate, then recommend. Only QQD can refund.",
};

export default function TicketDetailPage() {
  const { id = "" } = useParams();
  const { data: t, isLoading, error, refetch } = useTicket(id);
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading || !t) return <div className="skeleton h-[520px] rounded-2xl" aria-busy="true" />;
  // Keyed by ticket so a draft reply never follows you to another ticket.
  return <Detail key={t.id} t={t} />;
}

function Detail({ t }: { t: Ticket }) {
  const me = useMe();
  const operators = (useOperators().data ?? []).filter((o) => o.segment === "support" || o.segment === "qqd");
  const project = (useProjects().data ?? []).find((p) => p.code === t.project_code);
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolution, setResolution] = useState("");
  const [refundOpen, setRefundOpen] = useState(false);
  const open = TICKET_STATUS[t.status].open;
  // Whole words only, so "example" or "examine" do not trigger the decline banner.
  const academic = /\b(essay|essays|coursework|exam|exams|thesis|homework|dissertation)\b/i.test(t.entries.map((e) => e.body).join(" ") + " " + t.subject);

  const reply = useAction(() => api.replyTicket(t.id, body, me.id, internal), { success: internal ? "Note added." : "Reply sent.", onSuccess: () => setBody("") });
  const update = useAction((patch: Partial<Pick<Ticket, "status" | "priority" | "owner_id">>) => api.updateTicket(t.id, patch, me.id), { success: "Ticket updated." });
  const resolve = useAction(() => api.resolveTicket(t.id, resolution, me.id), { success: "Ticket resolved.", onSuccess: () => setResolveOpen(false) });

  return (
    <>
      <PageHeader
        back={{ to: "/tickets", label: "Tickets" }}
        eyebrow={
          <>
            <Code>{t.reference}</Code>
            <Pill tone={TICKET_PRIORITY[t.priority].tone}>{TICKET_PRIORITY[t.priority].label}</Pill>
            <Pill tone={TICKET_STATUS[t.status].tone}>{TICKET_STATUS[t.status].label}</Pill>
            {open && !t.first_response_at ? <SlaClock since={t.created_at} target={TICKET_PRIORITY[t.priority].firstResponse} escalate={TICKET_PRIORITY[t.priority].firstResponse * 1.5} /> : null}
          </>
        }
        title={t.subject}
        sub={`${TICKET_CATEGORY[t.category]} from ${t.requester.role === "doer" ? "doer" : t.requester.role} ${t.requester.label}, opened ${formatRelative(t.created_at)}.`}
        actions={
          open ? (
            <>
              {t.project_code && me.segment === "support" && !t.refund_recommendation ? (
                <Button onClick={() => setRefundOpen(true)}><ReceiptText /> Recommend refund</Button>
              ) : null}
              <Button variant="primary" onClick={() => setResolveOpen(true)}><CheckCircle2 /> Resolve</Button>
            </>
          ) : null
        }
      />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-4">
          {academic ? (
            <div className="flex gap-3 rounded-2xl border border-warning-dot/35 bg-warning-bg p-4 text-[13px] text-warning-ink">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <div><b>This looks like academic work.</b> We do not take it on. Decline politely and close the ticket.</div>
            </div>
          ) : null}
          {PATHS[t.category] ? <p className="rounded-2xl border border-line-card bg-surface-2 p-4 text-[13px] text-ink-muted"><b className="text-ink-2">Next steps:</b> {PATHS[t.category]}</p> : null}

          <Panel title="Conversation" padded={false}>
            <ol className="space-y-3 p-4">
              {t.entries.map((e) => (
                <li key={e.id} className={cn("flex", e.kind === "reply" ? "justify-end" : "justify-start", e.kind === "event" && "justify-center")}>
                  {e.kind === "event" ? (
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-3">{e.author_label}: {e.body} · {formatRelative(e.created_at)}</span>
                  ) : (
                    <div className="max-w-[80%]">
                      <div className={cn("mb-1 flex items-center gap-1.5 text-[11.5px]", e.kind === "reply" && "justify-end")}>
                        <b className="text-ink-2">{e.author_label}</b>
                        {e.kind === "internal_note" ? <span className="inline-flex items-center gap-1 text-warning-ink"><Lock className="h-3 w-3" /> Internal note</span> : null}
                        <span className="text-ink-3">{formatDateTime(e.created_at)}</span>
                      </div>
                      <p className={cn("prose-plain rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed", e.kind === "reply" ? "rounded-br-md bg-ink text-inverse" : e.kind === "internal_note" ? "rounded-bl-md border border-warning-dot/30 bg-warning-bg" : "rounded-bl-md border border-line-card bg-surface-2")}>{e.body}</p>
                    </div>
                  )}
                </li>
              ))}
            </ol>
            {open ? (
              <form className="border-t border-line-subtle p-3" onSubmit={(e) => { e.preventDefault(); if (body.trim()) reply.mutate(undefined); }}>
                <div className="mb-2 flex items-center gap-1 rounded-full border border-line-card bg-surface-2 p-0.5 text-[12.5px] font-semibold" role="tablist" aria-label="Reply type">
                  <button type="button" role="tab" aria-selected={!internal} onClick={() => setInternal(false)} className={cn("flex-1 rounded-full px-3 py-1", !internal ? "bg-surface shadow-soft-sm" : "text-ink-3")}>Reply to requester</button>
                  <button type="button" role="tab" aria-selected={internal} onClick={() => setInternal(true)} className={cn("flex-1 rounded-full px-3 py-1", internal ? "bg-warning-bg text-warning-ink shadow-soft-sm" : "text-ink-3")}>Internal note</button>
                </div>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder={internal ? "Staff only" : "Signed as Support"} aria-label="Message" />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <SideTag side={internal ? "internal" : t.requester.role === "doer" ? "doer" : "client"}>{internal ? "Requester cannot see this" : "Requester sees this"}</SideTag>
                  <Button type="submit" size="sm" variant={internal ? "outline" : "primary"} className="ml-auto" loading={reply.isPending} disabled={!body.trim()}><SendHorizontal /> {internal ? "Add note" : "Send reply"}</Button>
                </div>
              </form>
            ) : (
              <div className="border-t border-line-subtle bg-success-bg/40 p-4 text-[13px]"><b>Resolution:</b> {t.resolution}</div>
            )}
          </Panel>
        </div>

        <div className="space-y-4 xl:sticky xl:top-3">
          <Panel title="Details">
            <div className="space-y-3">
              <Field label="Owner">{({ id }) => <Select id={id} disabled={!open} value={t.owner_id} placeholder="Unassigned" onChange={(v) => update.mutate({ owner_id: v })} options={operators.map((o) => ({ value: o.id, label: o.full_name, hint: o.segment === "qqd" ? "QQD" : "Support" }))} />}</Field>
              <Field label="Priority">{({ id }) => <Select<TicketPriority> id={id} disabled={!open} value={t.priority} onChange={(v) => update.mutate({ priority: v })} options={(Object.keys(TICKET_PRIORITY) as TicketPriority[]).map((p) => ({ value: p, label: TICKET_PRIORITY[p].label }))} />}</Field>
              <Field label="Status">{({ id }) => <Select<TicketStatus> id={id} disabled={!open} value={t.status} onChange={(v) => update.mutate({ status: v })} options={(["new", "in_progress", "awaiting_requester", "awaiting_internal"] as TicketStatus[]).map((s) => ({ value: s, label: TICKET_STATUS[s].label }))} />}</Field>
            </div>
            <KeyValue className="mt-4" items={[{ k: "First reply", v: t.first_response_at ? formatRelative(t.first_response_at) : "Not yet" }, { k: "Category", v: TICKET_CATEGORY[t.category] }]} />
          </Panel>
          {t.project_code ? (
            <Panel title="Linked project">
              {project ? (
                <>
                  <div className="flex items-center gap-2"><Code>{project.code}</Code><StatusPill status={project.status} /></div>
                  <div className="mt-1 text-[13.5px] font-semibold">{project.title}</div>
                  <KeyValue className="mt-3" items={[{ k: "Paid", v: <Money amount={project.quote_amount} currency={project.quote_currency} /> }, { k: "Flags", v: `${project.flag_count} of 3` }]} />
                  <Button asChild size="sm" variant="outline" className="mt-3 w-full"><Link to={`/projects/${project.id}`}>Open project <ArrowRight /></Link></Button>
                </>
              ) : (
                <p className="text-[13px] text-ink-muted"><Code>{t.project_code}</Code> is not in the demo data.</p>
              )}
            </Panel>
          ) : null}
          {t.refund_recommendation ? (
            <Panel title="Refund recommended" tone="warning">
              <p className="text-[13px]"><b className="capitalize">{t.refund_recommendation.kind}</b> refund of <Money amount={t.refund_recommendation.amount} currency={t.refund_recommendation.currency} />, waiting for QQD.</p>
            </Panel>
          ) : null}
        </div>
      </div>

      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent title="Resolve ticket" footer={<><Button variant="ghost" onClick={() => setResolveOpen(false)}>Cancel</Button><Button variant="primary" loading={resolve.isPending} disabled={resolution.trim().length < 10} onClick={() => resolve.mutate(undefined)}>Resolve</Button></>}>
          <Field label="Resolution" required>{({ id }) => <Textarea id={id} value={resolution} onChange={(e) => setResolution(e.target.value)} rows={4} autoFocus />}</Field>
        </DialogContent>
      </Dialog>
      {project || t.project_code ? <RefundDialog t={t} open={refundOpen} onOpenChange={setRefundOpen} currency={project?.quote_currency ?? "INR"} paid={project?.quote_amount ?? null} /> : null}
    </>
  );
}

function RefundDialog({ t, open, onOpenChange, currency, paid }: { t: Ticket; open: boolean; onOpenChange: (v: boolean) => void; currency: NonNullable<Ticket["refund_recommendation"]>["currency"]; paid: number | null }) {
  const me = useMe();
  const [kind, setKind] = useState<"full" | "partial">("partial");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const send = useAction(
    () => {
      const minor = kind === "full" && paid ? paid : parseMajorToMinor(amount);
      if (!minor) throw new Error(`PORTAL: Enter the refund amount in ${currency}.`);
      return api.recommendRefund(t.id, { kind, amount: minor, currency, note }, me.id);
    },
    { success: "Sent to QQD.", onSuccess: () => onOpenChange(false) },
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Recommend a refund" description="The supervisor decides if the doer was at fault. Then QQD refunds." footer={<><Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="primary" loading={send.isPending} onClick={() => send.mutate(undefined)}>Send to QQD</Button></>}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Type">{({ id }) => <Select id={id} value={kind} onChange={setKind} options={[{ value: "partial", label: "Partial refund" }, { value: "full", label: "Full refund" }]} />}</Field>
            <Field label={`Amount (${currency})`} hint={kind === "full" ? "Full amount paid" : undefined}>{({ id, describedBy }) => <Input id={id} disabled={kind === "full"} inputMode="decimal" value={kind === "full" && paid ? String(paid / 100) : amount} onChange={(e) => setAmount(e.target.value)} aria-describedby={describedBy} />}</Field>
          </div>
          <Field label="Recommendation for QQD" required hint="What happened and why this amount.">{({ id, describedBy }) => <Textarea id={id} value={note} onChange={(e) => setNote(e.target.value)} rows={4} aria-describedby={describedBy} />}</Field>
        </div>
      </DialogContent>
    </Dialog>
  );
}
