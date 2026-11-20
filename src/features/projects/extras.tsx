import { useState } from "react";
import { LifeBuoy, RotateCcw } from "lucide-react";
import type { Flag, Project, ProjectDoer, Ticket } from "@/types/domain";
import { useAction, useOperators, useProjectHistory } from "@/api/hooks";
import * as api from "@/api/portal";
import { useMe } from "@/providers/SessionProvider";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { DemoNote, EmptyState, Panel } from "@/components/portal/kit";
import { SideTag } from "@/components/portal/pills";
import { FLAG_REASON, FREE_REVISIONS } from "@/lib/config";
import { formatRelative } from "@/lib/datetime";
import { env } from "@/lib/env";

/* Client revision banner --------------------------------------------- */

export function RevisionBanner({ p }: { p: Project }) {
  if (p.status !== "in_progress" || !p.revision_count || !p.client_revision_reason) return null;
  return (
    <div className="flex gap-3 rounded-2xl border border-warning-dot/35 bg-warning-bg p-4 text-[13px]">
      <RotateCcw className="mt-0.5 h-4 w-4 shrink-0 text-warning-ink" aria-hidden="true" />
      <div>
        <div className="font-bold text-warning-ink">
          Client asked for changes ({p.revision_count} of {FREE_REVISIONS} free)
        </div>
        <p className="mt-0.5 text-ink-2">{p.client_revision_reason}</p>
        {p.revision_count >= FREE_REVISIONS ? <p className="mt-1 text-xs text-ink-3">This was the last free revision. More changes need a paid quote from QQD.</p> : null}
      </div>
    </div>
  );
}

/* Reply to a flag ----------------------------------------------------- */

const PLAN_TEMPLATE: Record<Flag["reason"], string> = {
  delay: "Thanks for flagging this. Here is the plan: ",
  quality: "Thanks for telling us. We are fixing this. Here is what changes: ",
  communication: "Sorry for the silence. From now on you'll get an update ",
  scope_mismatch: "Thanks for raising this. Here is how we'll match what you asked for: ",
  other: "Thanks for flagging this. Here is what happens next: ",
};

export function FlagReplyButton({ p, flag, index }: { p: Project; flag: Flag; index: number }) {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(PLAN_TEMPLATE[flag.reason]);
  const send = useAction(() => api.respondToFlag(p.id, flag.id, text, me.id), { success: "Reply sent to the client.", onSuccess: () => setOpen(false) });
  return (
    <>
      <Button size="xs" variant="primary" className="mt-2" onClick={() => setOpen(true)}>
        {index >= 1 ? "Post a written plan" : "Reply to the client"}
      </Button>
      {open ? (
        <Dialog open onOpenChange={setOpen}>
          <DialogContent
            title={`Reply to flag ${index + 1}: ${FLAG_REASON[flag.reason]}`}
            description={flag.detail}
            footer={
              <>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="client" loading={send.isPending} disabled={text.trim().length < 20} onClick={() => send.mutate(undefined)}>Send to client</Button>
              </>
            }
          >
            <Field label={index >= 1 ? "Your plan" : "Your reply"} hint="Say what happens and by when.">
              {({ id, describedBy }) => <Textarea id={id} rows={6} value={text} onChange={(e) => setText(e.target.value)} aria-describedby={describedBy} autoFocus />}
            </Field>
            <div className="mt-3"><SideTag side="client" /></div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

/* Replace a doer ------------------------------------------------------ */

export function ReplaceDoerButton({ d }: { d: ProjectDoer }) {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const replace = useAction(() => api.replaceDoer(d.id, reason, me.id), { success: `${d.doer_code} is off the project. Find a new doer.`, onSuccess: () => setOpen(false) });
  return (
    <>
      <Button size="xs" variant="ghost" onClick={() => setOpen(true)}>Replace</Button>
      {open ? (
        <Dialog open onOpenChange={setOpen}>
          <DialogContent
            title={`Replace ${d.doer_code}`}
            description="The client isn't told. Their workspace access ends and you offer the part again."
            footer={
              <>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="danger" loading={replace.isPending} disabled={reason.trim().length < 10} onClick={() => replace.mutate(undefined)}>Replace doer</Button>
              </>
            }
          >
            <Field label="Why" hint="Internal only.">
              {({ id, describedBy }) => <Textarea id={id} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} aria-describedby={describedBy} autoFocus />}
            </Field>
            <p className="mt-3 text-xs text-ink-3">Remember to remove their access in the workspace too.</p>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

/* Project history ----------------------------------------------------- */

export function HistoryPanel({ p }: { p: Project }) {
  const { data, isLoading } = useProjectHistory(p.id);
  const items = data ?? [];
  return (
    <Panel title="History" padded={false}>
      {isLoading ? (
        <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-6" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState title="Nothing yet" className="py-8" />
      ) : (
        <ol className="max-h-[320px] overflow-y-auto px-4 py-3">
          {items.map((e) => (
            <li key={e.id} className="relative border-l border-line-card pb-3 pl-4 last:pb-0">
              <span className="absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
              <div className="text-[13px] text-ink">{e.text}</div>
              <div className="text-[11.5px] text-ink-3">
                {e.actor_label} · {formatRelative(e.created_at)}
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

/* Demo: play the client ----------------------------------------------- */

export function ClientDemoBar({ p }: { p: Project }) {
  const [reason, setReason] = useState<Flag["reason"]>("delay");
  const approve = useAction(() => api.demo.clientApproves(p.id), { success: "Demo: client approved. QQD can pay now." });
  const revise = useAction(() => api.demo.clientRevises(p.id, "Please make the headline bigger and use our darker brand colour."), { success: "Demo: client asked for changes." });
  const flag = useAction(() => api.demo.clientFlags(p.id, reason, "I'm not happy with how this is going."), { success: "Demo: client raised a flag." });
  if (!env.demoMode) return null;
  const live = p.status === "in_progress" || p.status === "in_review" || p.status === "delivered";
  if (!live) return null;
  return (
    <DemoNote>
      Play the client:
      {p.status === "delivered" ? (
        <>
          <Button size="xs" variant="outline" loading={approve.isPending} onClick={() => approve.mutate(undefined)}>Approve</Button>
          <Button size="xs" variant="outline" loading={revise.isPending} onClick={() => revise.mutate(undefined)}>Ask for changes</Button>
        </>
      ) : null}
      {p.flag_count < 3 ? (
        <span className="flex items-center gap-1.5">
          <Select size="sm" className="h-7 w-36 bg-surface" aria-label="Flag reason" value={reason} onChange={setReason} options={(Object.keys(FLAG_REASON) as Flag["reason"][]).map((r) => ({ value: r, label: FLAG_REASON[r] }))} />
          <Button size="xs" variant="outline" loading={flag.isPending} onClick={() => flag.mutate(undefined)}>Raise a flag</Button>
        </span>
      ) : null}
    </DemoNote>
  );
}

/* Ask Support (supervisor escalation) -------------------------------- */

export function AskSupportButton({ p }: { p: Project }) {
  const me = useMe();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Ticket["category"]>("doer_issue");
  const [priority, setPriority] = useState<Ticket["priority"]>("normal");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const send = useAction(() => api.escalateToSupport(p.id, { category, priority, subject, body }, me.id), {
    success: (t) => `Sent to Support as ${t.reference}.`,
    onSuccess: () => setOpen(false),
  });
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <LifeBuoy /> Ask Support
      </Button>
      {open ? (
        <Dialog open onOpenChange={setOpen}>
          <DialogContent
            title="Ask Support for help"
            description={`${p.code} is linked. Support can read both chats.`}
            footer={
              <>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="primary" loading={send.isPending} disabled={subject.trim().length < 5 || body.trim().length < 20} onClick={() => send.mutate(undefined)}>Send</Button>
              </>
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="About">
                  {({ id }) => (
                    <Select
                      id={id}
                      value={category}
                      onChange={setCategory}
                      options={[
                        { value: "doer_issue", label: "A doer" },
                        { value: "conduct", label: "Behaviour" },
                        { value: "quality_complaint", label: "Quality" },
                        { value: "delay_complaint", label: "Delay" },
                        { value: "billing", label: "Billing" },
                        { value: "other", label: "Something else" },
                      ]}
                    />
                  )}
                </Field>
                <Field label="How urgent">
                  {({ id }) => (
                    <Select id={id} value={priority} onChange={setPriority} options={[{ value: "low", label: "Low" }, { value: "normal", label: "Normal" }, { value: "high", label: "High" }, { value: "critical", label: "Critical" }]} />
                  )}
                </Field>
              </div>
              <Field label="Subject">{({ id }) => <Input id={id} value={subject} onChange={(e) => setSubject(e.target.value)} autoFocus />}</Field>
              <Field label="What happened" hint="And what you need from Support.">
                {({ id, describedBy }) => <Textarea id={id} rows={5} value={body} onChange={(e) => setBody(e.target.value)} aria-describedby={describedBy} />}
              </Field>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

/* Change supervisor (QQD) -------------------------------------------- */

export function ChangeSupervisorButton({ p }: { p: Project }) {
  const me = useMe();
  const operators = useOperators().data ?? [];
  const supervisors = operators.filter((o) => o.segment === "supervisor" && o.id !== p.supervisor_id);
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const move = useAction(() => api.reassignSupervisor(p.id, to ?? "", reason, me.id), { success: "Supervisor changed.", onSuccess: () => setOpen(false) });
  return (
    <>
      <Button size="xs" variant="ghost" onClick={() => setOpen(true)}>Change</Button>
      {open ? (
        <Dialog open onOpenChange={setOpen}>
          <DialogContent
            title="Change supervisor"
            description="The client sees no change. Doers see their new supervisor."
            footer={
              <>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="primary" loading={move.isPending} disabled={!to || reason.trim().length < 5} onClick={() => move.mutate(undefined)}>Change</Button>
              </>
            }
          >
            <div className="space-y-4">
              <Field label="New supervisor">
                {({ id }) => (
                  <Select
                    id={id}
                    value={to}
                    onChange={setTo}
                    placeholder="Choose"
                    options={supervisors.map((s) => ({ value: s.id, label: `${s.full_name}${s.on_duty ? "" : " (off duty)"}`, hint: `${s.categories.join(", ")} · ${s.active_project_count} active` }))}
                  />
                )}
              </Field>
              <Field label="Why">{({ id }) => <Input id={id} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: on leave this week" />}</Field>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
