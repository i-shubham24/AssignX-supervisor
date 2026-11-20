import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ExternalLink, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { useAction, useHeld, useProjects } from "@/api/hooks";
import * as api from "@/api/portal";
import { useMe } from "@/providers/SessionProvider";
import { EmptyState, ErrorState, PageHeader, Panel, SlaClock } from "@/components/portal/kit";
import { CategoryBadge, Code, Pill, SideTag } from "@/components/portal/pills";
import { Button } from "@/components/ui/button";
import { CATEGORIES, SLA } from "@/lib/config";
import { formatTime } from "@/lib/datetime";
import { cn } from "@/lib/cn";
import type { HeldItem } from "@/types/domain";

const REASON = { contact_details: "Contact details", identity_reveal: "Identity reveal" } as const;

/**
 * Held messages awaiting a decision (PRD 6.3, 13.5). Actionable by Supervisor,
 * Support and QQD (FR-SV-009). Supervisors see their own projects; Support and QQD
 * see everything so the 15 minute SLA holds around the clock.
 */
export default function ModerationPage() {
  const me = useMe();
  const held = useHeld();
  const projects = useProjects();
  const mineIds = new Set((projects.data ?? []).filter((p) => p.supervisor_id === me.id).map((p) => p.id));
  const items = (held.data ?? []).filter((h) => me.segment !== "supervisor" || mineIds.has(h.project.id));
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const bulkDecide = useAction(
    (decision: "approve" | "remove") => api.moderateMessagesBulk(Array.from(selected), decision, me.id),
    {
      success: (r, d) => (d === "approve" ? `Approved ${r.count} messages.` : `Removed ${r.count} messages.`),
      onSuccess: () => setSelected(new Set()),
    },
  );

  const allSelected = items.length > 0 && selected.size === items.length;
  const toggleSelectAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((h) => h.message.id)));
  };

  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  return (
    <>
      <PageHeader
        title="Messages on hold"
        sub="Recipients see nothing until you decide."
        actions={<Pill tone={items.length ? "warning" : "success"}>{items.length} waiting</Pill>}
      />
      <div className="mb-4 grid grid-cols-1 gap-3 text-[12.5px] md:grid-cols-3">
        <Rule title="Approve" body="Delivered in its original order." />
        <Rule title="Remove" body="Deleted. The recipient never sees it." />
        <Rule title="Task content is fine" body="A phone number on a poster brief is task content. Approve it." />
      </div>

      {items.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line-card bg-surface px-4 py-2.5 shadow-soft-sm">
          <label className="flex cursor-pointer items-center gap-2.5 text-[13px] font-semibold text-ink">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
            />
            <span>{selected.size ? `${selected.size} of ${items.length} selected` : "Select all"}</span>
          </label>
          {selected.size > 0 ? (
            <div className="flex items-center gap-2">
              <Button
                size="xs"
                variant="success"
                loading={bulkDecide.isPending && bulkDecide.variables === "approve"}
                disabled={bulkDecide.isPending}
                onClick={() => bulkDecide.mutate("approve")}
              >
                <Check className="h-3.5 w-3.5" /> Approve selected ({selected.size})
              </Button>
              <Button
                size="xs"
                variant="danger-soft"
                loading={bulkDecide.isPending && bulkDecide.variables === "remove"}
                disabled={bulkDecide.isPending}
                onClick={() => bulkDecide.mutate("remove")}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove selected ({selected.size})
              </Button>
              <Button size="xs" variant="ghost" onClick={() => setSelected(new Set())}>
                Clear
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {held.error ? (
        <Panel><ErrorState error={held.error} onRetry={() => void held.refetch()} /></Panel>
      ) : held.isLoading ? (
        <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)}</div>
      ) : items.length === 0 ? (
        <Panel><EmptyState icon={<ShieldCheck />} title="Nothing on hold" /></Panel>
      ) : (
        <ul className="space-y-3">
          <AnimatePresence initial={false}>
            {items.map((h) => (
              <motion.li key={h.message.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0, marginTop: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}>
                <HeldCard
                  h={h}
                  selected={selected.has(h.message.id)}
                  onToggle={() => toggleOne(h.message.id)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </>
  );
}

function Rule({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-line-card bg-surface p-3 shadow-soft-sm">
      <div className="font-bold text-ink">{title}</div>
      <div className="mt-0.5 text-ink-muted">{body}</div>
    </div>
  );
}

function HeldCard({ h, selected, onToggle }: { h: HeldItem; selected?: boolean; onToggle?: () => void }) {
  const me = useMe();
  const m = h.message;
  const decide = useAction((decision: "approve" | "remove") => api.moderateMessage(m.id, decision, me.id), {
    success: (_r, d) => (d === "approve" ? "Approved and delivered." : "Removed. The recipient never saw it."),
  });
  const fromClient = m.sender_role === "client";
  const recipient = m.channel === "internal" ? "the supervisor and other doers" : fromClient ? "the experts in the thread" : "the client";
  return (
    <section className={cn("overflow-hidden rounded-2xl border bg-surface shadow-soft-sm transition-colors", selected ? "border-primary ring-1 ring-primary" : "border-warning-dot/35")}>
      <header className="flex flex-wrap items-center gap-2 border-b border-line-subtle bg-warning-bg/50 px-4 py-2.5">
        {onToggle ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            aria-label={`Select message from ${m.sender_label}`}
            className="h-4 w-4 rounded border-line text-primary focus:ring-primary"
          />
        ) : null}
        <ShieldAlert className="h-4 w-4 text-warning-ink" aria-hidden="true" />
        <span className="text-[13px] font-bold text-warning-ink">{m.held_reason ? REASON[m.held_reason] : "On hold"}</span>
        <Code>{h.project.code}</Code>
        <CategoryBadge category={h.project.category} short />
        <span className="truncate text-[12.5px] text-ink-muted">{h.project.title}</span>
        <SideTag side={m.channel === "internal" ? "doer" : "client"}>{m.channel === "internal" ? "Internal channel" : "Client thread"}</SideTag>
        <SlaClock className="ml-auto" since={m.created_at} target={SLA.moderation.target} escalate={SLA.moderation.escalate} />
      </header>
      <div className="grid grid-cols-1 gap-0 md:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 p-4">
          {h.context.length ? (
            <div className="mb-3 space-y-1.5 border-l-2 border-line-card pl-3">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-3">Before this</div>
              {h.context.map((c) => (
                <p key={c.id} className="text-[12.5px] text-ink-muted">
                  <b className="text-ink-2">{c.sender_label}</b> <span className="text-ink-3">{formatTime(c.created_at)}</span>: {c.body}
                </p>
              ))}
            </div>
          ) : null}
          <div className="mb-1 flex items-center gap-2 text-[12px]">
            <b>{m.sender_label}</b>
            {m.sender_role === "expert" && m.discipline ? <span className="text-ink-3">appears as {CATEGORIES[m.discipline].expert}</span> : null}
            <span className="text-ink-3">{formatTime(m.created_at)}</span>
          </div>
          <p className={cn("prose-plain rounded-2xl border-2 border-dashed border-warning-dot/60 px-3.5 py-2.5 text-[14px] leading-relaxed", fromClient ? "bg-client-light/50" : "bg-doer-light/50")}>{m.body}</p>
          {m.screen_note ? <p className="mt-2 text-[12.5px] text-ink-muted"><b className="text-ink-2">Why held:</b> {m.screen_note}</p> : null}
        </div>
        <aside className="flex flex-col gap-2 border-t border-line-subtle bg-surface-2 p-4 md:border-l md:border-t-0">
          <p className="text-[12px] text-ink-muted">Hidden from {recipient}. {fromClient ? "The client sees it marked as under review." : "The doer sees it blocked."}</p>
          <Button variant="success" loading={decide.isPending && decide.variables === "approve"} disabled={decide.isPending} onClick={() => decide.mutate("approve")}>
            <Check /> Approve and deliver
          </Button>
          <Button variant="danger-soft" loading={decide.isPending && decide.variables === "remove"} disabled={decide.isPending} onClick={() => decide.mutate("remove")}>
            <Trash2 /> Remove
          </Button>
          <Button asChild variant="ghost" size="sm" className="mt-auto">
            <Link to={`/projects/${h.project.id}`}>Open project <ExternalLink /></Link>
          </Button>
        </aside>
      </div>
    </section>
  );
}
