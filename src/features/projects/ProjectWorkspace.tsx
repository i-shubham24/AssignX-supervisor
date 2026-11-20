import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Camera,
  ClipboardCheck,
  ExternalLink,
  Flag,
  HandCoins,
  Link2,
  Lock,
  MessageSquare,
  Paperclip,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { useAction, useHeld, useMessages, useOperators, useProject, useRefunds } from "@/api/hooks";
import * as api from "@/api/portal";
import { useMe } from "@/providers/SessionProvider";
import type { Project, ProjectDoer, RefundRequest } from "@/types/domain";
import { effectivePayout, projectMargin } from "@/lib/margin";
import { parseMajorToMinor } from "@/lib/money";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Compass } from "lucide-react";
import { CATEGORIES, FLAG_REASON, OPEN_POOL_AFTER_FAILED_OFFERS, SLA, STATUS } from "@/lib/config";
import { formatDateTime, formatRelative, HOUR, hoursToLabel } from "@/lib/datetime";
import { formatInr, formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";
import { env } from "@/lib/env";
import { DemoNote, EmptyState, ErrorState, KeyValue, Money, PageHeader, Panel, ProgressBar, SlaClock } from "@/components/portal/kit";
import { CategoryBadge, Code, Pill, SideTag, StatusPill, UrgencyPill } from "@/components/portal/pills";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/overlay";
import { safeWorkspaceHref } from "@/lib/safe-url";
import { ChatThread } from "./ChatThread";
import { AskSupportButton, ChangeSupervisorButton, ClientDemoBar, FlagReplyButton, HistoryPanel, ReplaceDoerButton, RevisionBanner } from "./extras";
import { OfferDialog } from "./OfferDialog";
import { ProgressDialog, SnapshotDialog, WorkingLinkDialog } from "./dialogs";
import { hasActiveDoer, isActiveDoer, isSourcing, openFlags } from "./queues";
import { useProjectRealtime } from "@/lib/realtime";

export default function ProjectWorkspace() {
  const { id = "" } = useParams();
  const { data: p, isLoading, error, refetch } = useProject(id);
  useProjectRealtime(id);
  const me = useMe();
  const [tab, setTab] = useState<"client" | "internal">("client");

  if (error) {
    // Out of scope and missing look the same (NFR-013).
    if (error instanceof Error && error.message.includes("no longer exists")) {
      return <EmptyState icon={<Compass />} title="Project not found" body="It doesn't exist, or it isn't one of yours." action={<Button asChild size="sm"><Link to="/">Back to dashboard</Link></Button>} />;
    }
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }
  if (isLoading || !p) return <WorkspaceSkeleton />;

  const canAct = me.segment === "supervisor" && p.supervisor_id === me.id;
  const backTo = me.segment === "supervisor" ? "/active" : "/projects";

  return (
    <>
      <PageHeader
        back={{ to: backTo, label: me.segment === "supervisor" ? "My projects" : "All projects" }}
        eyebrow={
          <>
            <Code>{p.code}</Code>
            <CategoryBadge category={p.category} />
            <UrgencyPill urgency={p.urgency} />
            <StatusPill status={p.status} />
            {p.flag_count ? <Pill tone="danger"><Flag className="h-3 w-3" /> {p.flag_count}/3 flags</Pill> : null}
          </>
        }
        title={p.title}
        sub={
          <>
            Client: <b className="text-ink-2">{p.client.display_name}</b> · {p.client.segment} · {p.client.country} · sees this as <i>{STATUS[p.status].client}</i>
          </>
        }
        actions={
          canAct ? (
            <>
              <AskSupportButton p={p} />
              {p.status === "in_review" ? (
                <Button asChild variant="primary" size="lg">
                  <Link to={`/qc/${p.id}`}>
                    <ClipboardCheck /> Open quality check
                  </Link>
                </Button>
              ) : null}
            </>
          ) : null
        }
      />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="min-w-0 space-y-4">
          <RevisionBanner p={p} />
          <NextStep p={p} canAct={canAct} />
          <LiabilityPanel p={p} canAct={canAct} />
          <TeamPanel p={p} canAct={canAct} />
          <BriefPanel p={p} />
          {me.segment !== "support" ? <MoneyPanel p={p} /> : null}
          {p.flags.length ? <FlagsPanel p={p} canAct={canAct} /> : null}
          <ClientDemoBar p={p} />
          <HistoryPanel p={p} />
        </div>

        <div className="min-w-0 xl:sticky xl:top-3">
          <section className="flex h-[70vh] min-h-[420px] flex-col xl:h-[calc(100dvh-110px)] xl:min-h-[560px] overflow-hidden rounded-2xl border border-line-card bg-surface shadow-soft-sm">
            <div className="flex items-center gap-1 border-b border-line-subtle p-1.5">
              <ThreadTab active={tab === "client"} onClick={() => setTab("client")} side="client" project={p} />
              <ThreadTab active={tab === "internal"} onClick={() => setTab("internal")} side="internal" project={p} />
            </div>
            <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }} className="flex min-h-0 flex-1 flex-col">
              {/* Keyed by project so a draft never follows you to another project. */}
              <ChatThread key={`${p.id}-${tab}`} project={p} channel={tab} className="flex-1" />
            </motion.div>
          </section>
        </div>
      </div>
    </>
  );
}

function ThreadTab({ active, onClick, side, project }: { active: boolean; onClick: () => void; side: "client" | "internal"; project: Project }) {
  const { data = [] } = useMessages(project.id, side);
  const held = useHeld().data?.filter((h) => h.project.id === project.id && h.message.channel === side).length ?? 0;
  const isClient = side === "client";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[13px] font-bold transition-colors",
        active ? (isClient ? "bg-client-light text-client-ink ring-1 ring-client/25" : "bg-doer-light text-doer-ink ring-1 ring-doer/25") : "text-ink-muted hover:bg-hover",
      )}
    >
      {isClient ? <MessageSquare className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
      {isClient ? "Client chat" : "Doer chat"}
      <span className="tabular rounded-full bg-surface px-1.5 text-[11px] text-ink-3 ring-1 ring-line-card">{data.filter((m) => m.sender_role !== "system").length}</span>
      {held ? <span className="tabular rounded-full bg-warning-dot px-1.5 text-[11px] text-white">{held} on hold</span> : null}
    </button>
  );
}

/* Next step ---------------------------------------------------------- */

function NextStep({ p, canAct }: { p: Project; canAct: boolean }) {
  const me = useMe();
  const [offerOpen, setOfferOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const pool = useAction(() => api.openToPool(p.id, me.id), { success: "Opened to qualified doers." });
  const self = useAction(() => api.selfAssign(p.id, me.id), { success: "You are doing this one yourself." });
  const release = useAction(() => api.releasePayout(p.id, me.id), { success: "Payout sent to QQD." });
  const submit = useAction(() => api.demo.doerSubmits(p.id), { success: "Demo: doer marked the work done." });
  const submitOwn = useAction(() => api.submitOwnWork(p.id, me.id), { success: "Sent to quality check." });

  if (p.status === "awaiting_quote" || p.status === "awaiting_payment") {
    return (
      <Panel tone="warning" title={p.status === "awaiting_quote" ? "Waiting for a QQD quote" : "Waiting for the client to pay"}>
        <p className="text-sm text-ink-muted">
          {p.status === "awaiting_quote" ? "QQD quotes within 30 minutes." : `Quote sent ${p.quote_sent_at ? formatRelative(p.quote_sent_at) : ""}. ${p.quote_expires_at ? `Expires ${formatRelative(p.quote_expires_at)}.` : "No deadline, so the quote does not expire."}`}
        </p>
        {me.segment === "qqd" && p.status === "awaiting_payment" ? (
          <Button asChild className="mt-3">
            <Link to={`/quotes/${p.id}`}>Change or reopen the quote <ArrowRight /></Link>
          </Button>
        ) : null}
        {me.segment === "qqd" && p.status === "awaiting_quote" ? (
          <Button asChild variant="primary" className="mt-3">
            <Link to={`/quotes/${p.id}`}>Write the quote <ArrowRight /></Link>
          </Button>
        ) : null}
      </Panel>
    );
  }

  if (p.status === "in_progress" && !p.supervisor_id) {
    return (
      <Panel tone="warning" title="Paid, waiting for a supervisor">
        <SlaClock since={p.paid_at} target={SLA.assignment.target} escalate={SLA.assignment.escalate} />
      </Panel>
    );
  }

  if (isSourcing(p)) {
    const unlocked = p.failed_offer_count >= OPEN_POOL_AFTER_FAILED_OFFERS;
    const open = p.doers.filter((d) => d.status === "offered");
    return (
      <Panel tone="client" title="Find a doer" actions={<SlaClock since={p.supervisor_assigned_at} target={SLA.sourcing.target} escalate={SLA.sourcing.escalate} />}>
        <ol className="mb-4 grid grid-cols-2 gap-2 text-[11.5px] sm:grid-cols-4">
          {["Offer at level rate", "Offer a second doer", "Raise and retry", "Open pool or do it"].map((s, i) => {
            const done = i < Math.min(p.failed_offer_count, 2) || (i === 2 && p.failed_offer_count > 2);
            const current = i === Math.min(p.failed_offer_count, 3);
            return (
              <li key={s} className={cn("rounded-xl border px-2.5 py-2", current ? "border-primary/40 bg-primary-light" : done ? "border-line-card bg-surface-2 text-ink-3 line-through" : "border-line-card text-ink-3")}>
                <span className="block text-[10px] font-bold uppercase tracking-wide">Step {i + 1}</span>
                {s}
              </li>
            );
          })}
        </ol>
        {open.length ? <p className="mb-3 text-sm text-ink-muted">{open.length} offer{open.length === 1 ? "" : "s"} open. You can offer other parts at the same time.</p> : null}
        {canAct ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setOfferOpen(true)}>
              <UserPlus /> {p.failed_offer_count >= 2 ? "Raise and re-offer" : "Offer to a doer"}
            </Button>
            <Button disabled={!unlocked || p.in_open_pool} loading={pool.isPending} onClick={() => pool.mutate(undefined)}>
              <Users /> {p.in_open_pool ? "In the open pool" : "Open pool"}
            </Button>
            <Button variant="ghost" disabled={!unlocked || open.length > 0} loading={self.isPending} onClick={() => self.mutate(undefined)}>
              Do it myself
            </Button>
          </div>
        ) : null}
        {canAct && !unlocked ? (
          <p className="mt-2 text-xs text-ink-3">
            Open pool and doing it yourself unlock after {OPEN_POOL_AFTER_FAILED_OFFERS} failed offers ({p.failed_offer_count} so far).
          </p>
        ) : null}
        {offerOpen ? <OfferDialog project={p} open onOpenChange={setOfferOpen} /> : null}
      </Panel>
    );
  }

  if (p.status === "in_progress" && p.self_assigned) {
    return (
      <Panel title="You're doing this one" tone="warning" actions={p.deadline_utc ? <SlaClock deadline={p.deadline_utc} warnWithin={24 * HOUR} /> : null}>
        <p className="text-sm text-ink-muted">Keep the client updated. When the work is ready, send it to quality check.</p>
        {canAct ? (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary" loading={submitOwn.isPending} onClick={() => submitOwn.mutate(undefined)}>
              <ClipboardCheck /> Send to quality check
            </Button>
            <Button onClick={() => setProgressOpen(true)}>
              <TrendingUp /> Update progress
            </Button>
          </div>
        ) : null}
        {progressOpen ? <ProgressDialog project={p} open onOpenChange={setProgressOpen} /> : null}
      </Panel>
    );
  }

  if (p.status === "in_progress") {
    const blocked = p.doers.filter((d) => isActiveDoer(d) && !d.working_link);
    const stale = p.progress_updated_at && Date.now() - new Date(p.progress_updated_at).getTime() > SLA.progressStale;
    return (
      <Panel title="Work in progress" tone={blocked.length ? "warning" : undefined} actions={p.deadline_utc ? <SlaClock deadline={p.deadline_utc} warnWithin={24 * HOUR} /> : null}>
        {blocked.length ? (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-warning-dot/30 bg-warning-bg px-3 py-2 text-[13px] font-semibold text-warning-ink">
            <Link2 className="h-4 w-4" /> {blocked.map((b) => b.doer_code).join(", ")} cannot start until you set a working link.
          </div>
        ) : null}
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[13px]">
              <span className="font-bold">{p.progress_percent ?? 0}%</span>
              <span className="truncate text-ink-muted">{p.progress_label ?? "No stage set yet"}</span>
              <SideTag side="client" className="ml-auto" />
            </div>
            <ProgressBar value={p.progress_percent} className="mt-2 h-2" tone={stale ? "warning" : "primary"} />
            <p className={cn("mt-1.5 text-xs", stale ? "font-semibold text-warning-ink" : "text-ink-3")}>
              {p.progress_updated_at ? `Updated ${formatRelative(p.progress_updated_at)}${stale ? ". Due for an update." : ""}` : "Never updated"}
            </p>
          </div>
        </div>
        {canAct ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setProgressOpen(true)}>
              <TrendingUp /> Update progress
            </Button>
            {p.category !== "writing" ? (
              <Button onClick={() => setSnapshotOpen(true)}>
                <Camera /> Post snapshot
              </Button>
            ) : null}
            <Button variant="ghost" onClick={() => setOfferOpen(true)}>
              <UserPlus /> Add a doer
            </Button>
          </div>
        ) : null}
        {env.demoMode && canAct && !blocked.length && hasActiveDoer(p) ? (
          <DemoNote className="mt-4">
            Simulate:
            <Button size="xs" variant="outline" loading={submit.isPending} onClick={() => submit.mutate(undefined)}>
              Doer marks work done
            </Button>
          </DemoNote>
        ) : null}
        {/* Mounted only while open, so each opening starts from current values. */}
        {progressOpen ? <ProgressDialog project={p} open onOpenChange={setProgressOpen} /> : null}
        {snapshotOpen ? <SnapshotDialog project={p} open onOpenChange={setSnapshotOpen} /> : null}
        {offerOpen ? <OfferDialog project={p} open onOpenChange={setOfferOpen} /> : null}
      </Panel>
    );
  }

  if (p.status === "in_review") {
    return (
      <Panel tone="client" title="In quality check" actions={<SlaClock since={p.progress_updated_at} target={SLA.qc.target} escalate={SLA.qc.escalate} />}>
        <p className="text-sm text-ink-muted">The client sees "Final checks".</p>
        {canAct ? (
          <Button asChild variant="primary" className="mt-3">
            <Link to={`/qc/${p.id}`}>
              <ClipboardCheck /> Open quality check
            </Link>
          </Button>
        ) : null}
      </Panel>
    );
  }

  if (p.status === "delivered") {
    const silentAt = p.delivered_at ? new Date(p.delivered_at).getTime() + SLA.silentRelease : 0;
    const canRelease = Date.now() >= silentAt;
    return (
      <Panel title="Delivered, waiting for approval" tone="warning">
        <p className="text-sm text-ink-muted">
          Delivered {p.delivered_at ? formatRelative(p.delivered_at) : ""}. {p.payout_released_at ? "Payout sent to QQD." : canRelease ? "No reply in 14 days. You can release the payout." : `You can release the payout ${formatRelative(new Date(silentAt).toISOString())}.`}
        </p>
        {canAct && !p.payout_released_at ? (
          <Button className="mt-3" variant={canRelease ? "primary" : "outline"} disabled={!canRelease} loading={release.isPending} onClick={() => release.mutate(undefined)}>
            <HandCoins /> Release payout
          </Button>
        ) : null}
      </Panel>
    );
  }

  return (
    <Panel title={p.status === "completed" ? "Completed" : "Cancelled"}>
      <p className="text-sm text-ink-muted">
        {p.status === "completed" ? `Approved ${p.approved_at ? formatRelative(p.approved_at) : ""}. QQD handles payouts.` : `Cancelled: ${p.cancellation_reason?.replace(/_/g, " ") ?? "no reason recorded"}.`}
      </p>
    </Panel>
  );
}

/* Team --------------------------------------------------------------- */

function TeamPanel({ p, canAct }: { p: Project; canAct: boolean }) {
  const me = useMe();
  const [linkFor, setLinkFor] = useState<ProjectDoer | null>(null);
  const withdraw = useAction((id: string) => api.withdrawOffer(id, me.id), { success: "Offer withdrawn." });
  const respond = useAction((v: { id: string; accept: boolean }) => api.demo.doerResponds(v.id, v.accept), {
    success: (_r, v) => (v.accept ? "Demo: doer accepted. Set the working link next." : "Demo: doer declined."),
  });
  const visible = p.doers.filter((d) => d.status !== "removed");

  return (
    <Panel title="Doer team" sub={p.self_assigned ? "Supervisor is doing this one" : p.in_open_pool ? "In the open pool" : undefined} padded={false} tone="doer">
      {visible.length === 0 ? (
        <EmptyState title="No offers yet" className="py-8" />
      ) : (
        <ul className="divide-y divide-line-subtle">
          {visible.map((d) => (
            <li key={d.id} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", isActiveDoer(d) ? "bg-doer text-white" : "bg-doer-light text-doer-ink")}>{d.doer_code.slice(-2)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {me.segment === "support" ? (
                      <span className="font-mono text-[13px] font-bold text-ink">{d.doer_code}</span>
                    ) : (
                      <Link to={`/doers/${d.doer_id}`} className="font-mono text-[13px] font-bold text-ink hover:underline">{d.doer_code}</Link>
                    )}
                    <span className="text-xs text-ink-3">client sees {CATEGORIES[d.discipline].expert}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-ink-muted">{d.scope_note ?? CATEGORIES[d.discipline].label}</div>
                </div>
                <div className="text-right">
                  {/* Support never sees doer pay (PRD 4.2). */}
                  {me.segment !== "support" ? <div className="text-[13px] font-bold tabular">{formatInr(effectivePayout(d))}</div> : null}
                  <OfferStatus d={d} />
                </div>
              </div>
              {isActiveDoer(d) ? (
                <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-surface-2 px-3 py-2 text-xs">
                  <Link2 className={cn("h-3.5 w-3.5", d.working_link ? "text-success-ink" : "text-warning-ink")} aria-hidden="true" />
                  {d.working_link ? (
                    safeWorkspaceHref(d.working_link) ? (
                      <a href={safeWorkspaceHref(d.working_link)!} target="_blank" rel="noreferrer noopener" className="min-w-0 flex-1 truncate font-medium text-ink-2 hover:underline">
                        {d.working_link}
                      </a>
                    ) : (
                      <span className="flex-1 truncate font-semibold text-danger-ink">This link is not allowed. Replace it.</span>
                    )
                  ) : (
                    <span className="flex-1 font-semibold text-warning-ink">No working link. The doer is blocked.</span>
                  )}
                  {canAct ? (
                    <Button size="xs" variant={d.working_link ? "ghost" : "primary"} onClick={() => setLinkFor(d)}>
                      {d.working_link ? "Change" : "Set link"}
                    </Button>
                  ) : null}
                  {d.working_link ? <ExternalLink className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" /> : null}
                  {canAct && d.status === "accepted" ? <ReplaceDoerButton d={d} /> : null}
                </div>
              ) : null}
              {isActiveDoer(d) && d.workspace_identity && me.segment !== "support" ? (
                <p className="mt-1.5 px-1 text-[11.5px] text-ink-3">
                  Workspace login: <span className="font-mono text-ink-2">{d.workspace_identity}</span>
                </p>
              ) : null}
              {d.status === "offered" && canAct ? (
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <SlaClock deadline={d.offer_expires_at} warnWithin={30 * 60_000} />
                  <Button size="xs" variant="ghost" loading={withdraw.isPending && withdraw.variables === d.id} onClick={() => withdraw.mutate(d.id)}>
                    Withdraw
                  </Button>
                  {env.demoMode ? (
                    <DemoNote className="ml-auto py-1">
                      <Button size="xs" variant="outline" onClick={() => respond.mutate({ id: d.id, accept: true })}>Accept</Button>
                      <Button size="xs" variant="outline" onClick={() => respond.mutate({ id: d.id, accept: false })}>Decline</Button>
                    </DemoNote>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {linkFor ? <WorkingLinkDialog assignment={linkFor} open={Boolean(linkFor)} onOpenChange={(v) => !v && setLinkFor(null)} /> : null}
    </Panel>
  );
}

function OfferStatus({ d }: { d: ProjectDoer }) {
  const map: Record<ProjectDoer["status"], { label: string; tone: React.ComponentProps<typeof Pill>["tone"] }> = {
    offered: { label: "Offer open", tone: "info" },
    accepted: { label: "Working", tone: "success" },
    declined: { label: "Declined", tone: "neutral" },
    expired: { label: "Expired", tone: "neutral" },
    removed: { label: "Withdrawn", tone: "neutral" },
    completed: { label: "Completed", tone: "success" },
  };
  const s = map[d.status];
  return (
    <Tip content={d.decline_reason ?? (d.accepted_at ? `Accepted ${formatDateTime(d.accepted_at)}` : `Offered ${formatDateTime(d.offered_at)}`)}>
      <span>
        <Pill tone={s.tone} className="mt-0.5 h-5 text-[10.5px]">{s.label}</Pill>
      </span>
    </Tip>
  );
}

/* Brief -------------------------------------------------------------- */

function BriefPanel({ p }: { p: Project }) {
  const briefFiles = p.attachments.filter((a) => a.kind === "brief");
  return (
    <Panel title="Client brief" actions={<SideTag side="internal">Redact before sharing with doers</SideTag>}>
      <p className="prose-plain text-[13.5px] leading-relaxed text-ink-2">{p.description}</p>
      {p.category_answers.length ? (
        <dl className="mt-4 divide-y divide-line-subtle rounded-xl border border-line-card">
          {p.category_answers.map((a) => (
            <div key={a.question} className="grid grid-cols-1 gap-0.5 px-3 py-2 text-[13px] sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:gap-3">
              <dt className="text-ink-3">{a.question}</dt>
              <dd className="font-medium text-ink">{a.answer}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <KeyValue
        className="mt-4 grid-cols-2 sm:grid-cols-3"
        cols={3}
        items={[
          { k: "Deadline", v: p.deadline_utc ? formatDateTime(p.deadline_utc) : "None given" },
          { k: "Urgency", v: <UrgencyPill urgency={p.urgency} /> },
          { k: "Submitted", v: formatRelative(p.created_at) },
        ]}
      />
      {briefFiles.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {briefFiles.map((a) => (
            <span key={a.id} className="inline-flex items-center gap-1.5 rounded-lg border border-line-card bg-surface-2 px-2.5 py-1.5 text-xs font-medium">
              <Paperclip className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
              {a.filename}
              <span className="text-ink-3">{Math.round(a.size_bytes / 1024)} KB</span>
            </span>
          ))}
        </div>
      ) : null}
    </Panel>
  );
}

/* Money (internal) -------------------------------------------------- */

function MoneyPanel({ p }: { p: Project }) {
  const me = useMe();
  const operators = useOperators().data ?? [];
  // One margin definition everywhere (src/lib/margin.ts). Open offers are shown apart.
  const payouts = p.doers.filter(isActiveDoer).reduce((s, d) => s + effectivePayout(d), 0);
  const offered = p.doers.filter((d) => d.status === "offered").reduce((s, d) => s + d.payout_amount_inr, 0);
  const margin = projectMargin(p);
  const qqd = operators.find((o) => o.id === p.qqd_id);
  const sup = operators.find((o) => o.id === p.supervisor_id);
  return (
    <Panel title="Money and owners" actions={<SideTag side="internal" />}>
      <KeyValue
        className="grid-cols-2 sm:grid-cols-3"
        cols={3}
        items={[
          { k: "Client quote", v: p.quote_amount !== null ? <Money amount={p.quote_amount} currency={p.quote_currency} /> : "Not quoted" },
          { k: "In INR", v: <Money amount={p.quote_amount_inr} /> },
          { k: "Delivery time", v: p.delivery_duration_hours ? hoursToLabel(p.delivery_duration_hours) : "Not set" },
          { k: "Doer cost estimate", v: <Money amount={p.expected_doer_cost_inr} /> },
          { k: "Doer payouts", v: <span><Money amount={payouts} />{offered ? <span className="block text-[11px] text-ink-3">+ {formatInr(offered)} in open offers</span> : null}</span> },
          { k: "Margin", v: margin !== null ? <span className={cn("font-bold tabular", margin < 0 ? "text-danger-ink" : "text-success-ink")}>{formatInr(margin)}</span> : "Not set" },
          { k: "Quoted by", v: qqd?.full_name ?? "Not yet" },
          { k: "Supervisor", v: <span className="flex flex-wrap items-center gap-1">{sup?.full_name ?? "Unassigned"}{me.segment === "qqd" && p.supervisor_id && ["in_progress", "in_review", "delivered"].includes(p.status) ? <ChangeSupervisorButton p={p} /> : null}</span> },
          { k: "Revisions used", v: `${p.revision_count} of 3 free` },
        ]}
      />
      {p.quote_note ? (
        <div className="mt-4 rounded-xl border border-client/20 bg-client-light/50 p-3 text-[13px]">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-bold text-client-ink">Quote note</span>
            <SideTag side="client" className="ml-auto" />
          </div>
          {p.quote_note}
        </div>
      ) : null}
      {p.quote_amount !== null && p.quote_currency !== "INR" ? <p className="mt-3 text-xs text-ink-3">Client pays {formatMoney(p.quote_amount, p.quote_currency)}. Doer payouts are in INR.</p> : null}
    </Panel>
  );
}

function FlagsPanel({ p, canAct }: { p: Project; canAct: boolean }) {
  return (
    <Panel title="Client flags" sub="The third flag goes to QQD and Support." tone="danger" padded={false}>
      <ul className="divide-y divide-line-subtle">
        {p.flags.map((f, i) => (
          <li key={f.id} className="flex items-start gap-3 px-4 py-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger-bg text-[12px] font-bold text-danger-ink">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold">
                {FLAG_REASON[f.reason]}
                {f.resolved_at ? <Pill tone="success">Resolved</Pill> : <SlaClock since={f.raised_at} target={SLA.firstFlagResponse} escalate={SLA.firstFlagResponse * 1.5} />}
              </div>
              <p className="mt-0.5 text-[13px] text-ink-muted">{f.detail}</p>
              <p className="mt-0.5 text-xs text-ink-3">
                Raised {formatRelative(f.raised_at)}.{" "}
                {i === 0 ? "Respond within 2 hours." : i === 1 ? "Post a written plan for the client. Your lead is told." : "If quality is the cause, replace the doer. The client isn't told."}
              </p>
              {canAct && !f.resolved_at ? <FlagReplyButton p={p} flag={f} index={i} /> : null}
            </div>
          </li>
        ))}
      </ul>
      {openFlags(p).length ? (
        <div className="border-t border-line-subtle px-4 py-2.5 text-xs text-ink-3">Your reply goes to the client chat.</div>
      ) : null}
    </Panel>
  );
}

/* Fault decision on a refund (PRD 6.6 step 4, 11.3) ------------------ */

const FAULT_OPTIONS: { value: NonNullable<RefundRequest["liability_decision"]>; label: string; hint: string }[] = [
  { value: "not_at_fault", label: "Work was fine, the client changed the brief", hint: "Doer paid in full" },
  { value: "partial", label: "Doer was partly at fault", hint: "Doer gets part of the payout" },
  { value: "at_fault", label: "Work wasn't good enough", hint: "No payout. The doer sees your reason" },
  { value: "company_process", label: "Our process failed", hint: "Doer paid in full" },
];

function LiabilityPanel({ p, canAct }: { p: Project; canAct: boolean }) {
  const me = useMe();
  const refunds = (useRefunds().data ?? []).filter((r) => r.project.id === p.id && r.status === "awaiting_execution");
  const [decision, setDecision] = useState<NonNullable<RefundRequest["liability_decision"]> | null>(null);
  const [reason, setReason] = useState("");
  const [partial, setPartial] = useState("");
  const pending = refunds.find((r) => !r.liability_decision);
  const decided = refunds.find((r) => r.liability_decision);
  const full = p.doers.filter(isActiveDoer).reduce((s, d) => s + d.payout_amount_inr, 0);
  const save = useAction(
    () => {
      if (!pending || !decision) throw new Error("PORTAL: Choose one option.");
      const partialInr = decision === "partial" ? parseMajorToMinor(partial) : null;
      return api.decideLiability(pending.id, decision, reason, partialInr, me.id);
    },
    { success: "Saved. QQD can now refund." },
  );
  if (!refunds.length) return null;

  if (!pending && decided) {
    return (
      <Panel title="Refund: fault decided" tone="warning">
        <p className="text-[13px] text-ink-2">
          <b>{FAULT_OPTIONS.find((o) => o.value === decided.liability_decision)?.label}.</b> {decided.liability_reason}
        </p>
        <p className="mt-1 text-xs text-ink-3">Waiting for QQD to refund the client.</p>
      </Panel>
    );
  }
  if (!pending) return null;
  if (!canAct) {
    return (
      <Panel title="Refund approved by Support" tone="warning">
        <p className="text-[13px] text-ink-muted">Waiting for the supervisor to decide if the doer was at fault.</p>
      </Panel>
    );
  }
  return (
    <Panel title="Was the doer at fault?" sub={`Support approved a ${pending.kind} refund. Your answer sets the doer's payout.`} tone="danger">
      <p className="mb-3 rounded-xl bg-surface-2 p-3 text-[13px] text-ink-2">{pending.recommendation}</p>
      <div role="radiogroup" aria-label="Fault decision" className="space-y-1.5">
        {FAULT_OPTIONS.map((o) => (
          <label key={o.value} className={cn("flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2", decision === o.value ? "border-primary bg-primary-light/50" : "border-line-card hover:border-line")}>
            <input type="radio" name={`fault-${p.id}`} className="mt-1 accent-[var(--color-primary)]" checked={decision === o.value} onChange={() => setDecision(o.value)} />
            <span>
              <span className="block text-[13px] font-semibold">{o.label}</span>
              <span className="block text-xs text-ink-3">{o.hint}</span>
            </span>
          </label>
        ))}
      </div>
      {decision === "partial" ? (
        <Field className="mt-3" label="Pay the doer (INR)" hint={`Full payout is ${formatInr(full)}.`}>
          {({ id, describedBy }) => <Input id={id} inputMode="decimal" value={partial} onChange={(e) => setPartial(e.target.value)} aria-describedby={describedBy} />}
        </Field>
      ) : null}
      <Field className="mt-3" label="Reason" hint="The doer sees this.">
        {({ id, describedBy }) => <Textarea id={id} rows={3} value={reason} onChange={(e) => setReason(e.target.value)} aria-describedby={describedBy} />}
      </Field>
      <Button variant="primary" className="mt-3" disabled={!decision || reason.trim().length < 10} loading={save.isPending} onClick={() => save.mutate(undefined)}>
        Save decision
      </Button>
    </Panel>
  );
}

function WorkspaceSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading project">
      <div className="skeleton mb-2 h-4 w-48" />
      <div className="skeleton mb-6 h-9 w-full max-w-[480px]" />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="space-y-4">
          <div className="skeleton h-40 rounded-2xl" />
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
        <div className="skeleton h-[600px] rounded-2xl" />
      </div>
    </div>
  );
}
