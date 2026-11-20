import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, BadgeCheck, Flag, HandCoins, Link2, ShieldAlert } from "lucide-react";
import { useMe } from "@/providers/SessionProvider";
import { useActivity, useDisbursements, useHeld, useOperators, useProjects, useRefunds, useTickets, useVerification } from "@/api/hooks";
import { formatRelative, HOUR } from "@/lib/datetime";
import { SLA, TICKET_PRIORITY, TICKET_STATUS, URGENCY } from "@/lib/config";
import { readSla } from "@/lib/sla";
import { formatInr, sumMinor } from "@/lib/money";
import { PageHeader, Panel, SlaClock, EmptyState, useNow } from "@/components/portal/kit";
import { Code, Pill, CategoryBadge } from "@/components/portal/pills";
import { DotMatrix, SplitBar } from "@/components/portal/charts";
import { Button } from "@/components/ui/button";
import type { ActivityEvent } from "@/types/domain";
import { isActive, isAssignmentQueue, isQc, isQuoteQueue, isSourcing, isUnderway, needsWorkingLink, openFlags } from "@/features/projects/queues";
import { cn } from "@/lib/cn";
import { DueChart, dueByHour, HeroCard, KpiStrip, ProjectCard, TodoList, type TodoItem } from "./widgets";

export default function OverviewPage() {
  const me = useMe();
  if (me.segment === "qqd") return <QqdOverview />;
  if (me.segment === "support") return <SupportOverview />;
  return <SupervisorOverview />;
}

const today = () => new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(new Date());

/** Share of open items still on time. Drives the hero gauge. */
function onTimeShare(readings: (ReturnType<typeof readSla> | null)[]): number {
  const live = readings.filter(Boolean);
  if (!live.length) return 100;
  return (live.filter((r) => r!.state === "ok" || r!.state === "due_soon").length / live.length) * 100;
}

/* Supervisor --------------------------------------------------------- */

function SupervisorOverview() {
  const me = useMe();
  const projects = useProjects();
  const held = useHeld();
  const verification = useVerification();
  const now = useNow();
  const [track, setTrack] = useState<"all" | "client" | "dolancer">("all");

  const mine = useMemo(() => (projects.data ?? []).filter((p) => p.supervisor_id === me.id), [projects.data, me.id]);
  const heldMine = (held.data ?? []).filter((h) => mine.some((p) => p.id === h.project.id));
  const onboarding = (verification.data ?? []).filter((v) => v.stage === "supervisor_call" && v.assigned_supervisor_id === me.id);

  const readings = [
    ...mine.filter(isSourcing).map((p) => readSla(p.supervisor_assigned_at, SLA.sourcing.target, SLA.sourcing.escalate, now)),
    ...mine.filter(isQc).map((p) => readSla(p.progress_updated_at, SLA.qc.target, SLA.qc.escalate, now)),
    ...heldMine.map((h) => readSla(h.message.created_at, SLA.moderation.target, SLA.moderation.escalate, now)),
  ];
  const due = dueByHour(
    [
      ...mine.filter(isSourcing).map((p) => new Date(p.supervisor_assigned_at ?? p.updated_at).getTime() + SLA.sourcing.target),
      ...mine.filter(isQc).map((p) => new Date(p.progress_updated_at ?? p.updated_at).getTime() + SLA.qc.target),
      ...heldMine.map((h) => new Date(h.message.created_at).getTime() + SLA.moderation.target),
      ...mine.filter(isActive).flatMap((p) => (p.deadline_utc ? [new Date(p.deadline_utc).getTime()] : [])),
      ...mine.flatMap((p) => openFlags(p).map((f) => new Date(f.raised_at).getTime() + SLA.firstFlagResponse)),
    ],
    now,
  );

  const todos: TodoItem[] = [];
  for (const p of mine) {
    for (const f of openFlags(p)) {
      todos.push({
        key: f.id,
        track: "client",
        icon: <Flag />,
        tone: "danger",
        code: p.code,
        title: `Reply to the client's ${f.reason.replace("_", " ")} flag`,
        detail: f.detail,
        due: <SlaClock since={f.raised_at} target={SLA.firstFlagResponse} escalate={SLA.firstFlagResponse * 1.5} />,
        to: `/projects/${p.id}`,
        cta: "Reply",
      });
    }
  }
  if (heldMine.length) {
    const oldest = heldMine[0]!;
    todos.push({
      key: "held",
      track: oldest.message.channel === "client" ? "client" : "dolancer",
      icon: <ShieldAlert />,
      tone: "warning",
      title: `${heldMine.length} message${heldMine.length === 1 ? "" : "s"} on hold`,
      detail: "Approve or remove them.",
      due: <SlaClock since={oldest.message.created_at} target={SLA.moderation.target} escalate={SLA.moderation.escalate} />,
      to: "/moderation",
      cta: "Review",
    });
  }
  for (const p of mine.filter(needsWorkingLink)) {
    todos.push({
      key: `wl-${p.id}`,
      track: "dolancer",
      icon: <Link2 />,
      tone: "warning",
      code: p.code,
      title: "Add the workspace link",
      detail: "The doer cannot start without it.",
      to: `/projects/${p.id}`,
      cta: "Add link",
    });
  }
  for (const p of mine.filter((x) => isUnderway(x) && x.progress_updated_at && now - new Date(x.progress_updated_at).getTime() > SLA.progressStale)) {
    todos.push({
      key: `st-${p.id}`,
      track: "dolancer",
      icon: <AlertTriangle />,
      tone: "info",
      code: p.code,
      title: "Update progress",
      detail: `Last update ${formatRelative(p.progress_updated_at!, now)}`,
      to: `/projects/${p.id}`,
      cta: "Update",
    });
  }
  for (const p of mine.filter((x) => x.status === "delivered" && x.delivered_at && !x.payout_released_at && now - new Date(x.delivered_at).getTime() > SLA.silentRelease)) {
    todos.push({
      key: `rel-${p.id}`,
      track: "client",
      icon: <HandCoins />,
      tone: "info",
      code: p.code,
      title: "Release the payout",
      detail: "No reply from the client in 14 days.",
      to: `/projects/${p.id}`,
      cta: "Release",
    });
  }

  const loading = projects.isLoading;
  const underway = mine.filter((p) => p.status === "in_progress" || p.status === "in_review");

  const filteredTodos = todos.filter((t) => {
    if (track === "client") return t.track === "client";
    if (track === "dolancer") return t.track === "dolancer";
    return true;
  });

  const filteredUnderway = underway.filter((p) => {
    if (track === "client") return p.status === "in_review" || p.flags.length > 0;
    if (track === "dolancer") return p.status === "in_progress" || isSourcing(p);
    return true;
  });

  return (
    <>
      <PageHeader
        eyebrow={today()}
        title="Dashboard"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex rounded-full border border-line-card bg-surface p-0.5 shadow-soft-sm" role="tablist" aria-label="Workstream focus">
              <button
                type="button"
                onClick={() => setTrack("all")}
                className={cn("rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors", track === "all" ? "bg-ink text-inverse shadow-sm" : "text-ink-muted hover:text-ink")}
              >
                All workstreams
              </button>
              <button
                type="button"
                onClick={() => setTrack("dolancer")}
                className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors", track === "dolancer" ? "bg-doer-ink text-white shadow-sm" : "text-ink-muted hover:text-ink")}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-doer" />
                Dolancers
              </button>
              <button
                type="button"
                onClick={() => setTrack("client")}
                className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors", track === "client" ? "bg-primary text-white shadow-sm" : "text-ink-muted hover:text-ink")}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary-to" />
                Clients
              </button>
            </div>
            <Button asChild variant="primary">
              <Link to="/sourcing">
                Find a doer <ArrowRight />
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid w-full max-w-full min-w-0 grid-cols-1 gap-4 overflow-hidden lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-5">
        <HeroCard
          name={me.full_name.split(" ")[0] ?? me.full_name}
          health={onTimeShare(readings)}
          lines={[
            { label: "Rating", value: me.average_rating?.toFixed(1) ?? "New" },
            { label: "Active", value: mine.filter(isActive).length },
            { label: "Delivered", value: mine.filter((p) => p.status === "delivered" || p.status === "completed").length },
          ]}
          cta={{ to: "/performance", label: "My stats" }}
        />
        <div className="flex w-full max-w-full min-w-0 flex-col gap-4 lg:gap-5">
          <KpiStrip
            loading={loading}
            items={[
              { label: "Active", value: mine.filter(isActive).length, to: "/active", spark: [3, 4, 4, 6, 5, mine.filter(isActive).length] },
              { label: "Need a doer", value: mine.filter(isSourcing).length, to: "/sourcing" },
              { label: "Quality check", value: mine.filter(isQc).length, to: "/qc" },
              { label: "On hold", value: heldMine.length, chip: heldMine.length ? { text: "Review", tone: "warning" } : undefined, to: "/moderation" },
              { label: "New doers", value: onboarding.length, to: "/onboarding" },
            ]}
          />
          <DueChart data={due} />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel
          title={track === "all" ? "To do" : track === "client" ? "To do (Client focus)" : "To do (Dolancer focus)"}
          actions={filteredTodos.length ? <Pill tone="warning" dot={false}>{filteredTodos.length}</Pill> : null}
          padded={false}
        >
          {loading ? (
            <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-12" />)}</div>
          ) : filteredTodos.length === 0 ? (
            <EmptyState icon={<BadgeCheck />} title="All done for now" body={track === "all" ? "New work shows up here." : `No pending ${track} actions.`} />
          ) : (
            <TodoList items={filteredTodos} />
          )}
        </Panel>
        <ActivityPanel scope={mine.map((p) => p.code)} />
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-bold tracking-[-0.02em]">In progress</h2>
            {track !== "all" ? <span className="rounded-full bg-subtle px-2 py-0.5 text-[11px] font-semibold text-ink-muted">{track === "client" ? "Client review & flags" : "Dolancer execution"}</span> : null}
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/active">
              View all <ArrowRight />
            </Link>
          </Button>
        </div>
        {filteredUnderway.length === 0 && !loading ? (
          <Panel><EmptyState title="Nothing in progress" body={track !== "all" ? `No active projects currently matching the ${track} track.` : undefined} /></Panel>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredUnderway.slice(0, 6).map((p) => (
              <ProjectCard key={p.id} p={p} to={p.status === "in_review" ? `/qc/${p.id}` : `/projects/${p.id}`} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

/* QQD ---------------------------------------------------------------- */

function QqdOverview() {
  const me = useMe();
  const projects = useProjects();
  const operators = useOperators();
  const disb = useDisbursements();
  const refunds = useRefunds();
  const verification = useVerification();
  const held = useHeld();
  const now = useNow();
  const all = projects.data ?? [];
  const quotes = [...all.filter(isQuoteQueue)].sort((a, b) => URGENCY[a.urgency].rank - URGENCY[b.urgency].rank || a.created_at.localeCompare(b.created_at));
  const assignment = all.filter(isAssignmentQueue);
  const queuedPayout = (disb.data ?? []).flatMap((d) => d.lines.filter((l) => l.status === "queued" || l.status === "failed"));
  const supervisors = (operators.data ?? []).filter((o) => o.segment === "supervisor");
  const paidToday = all.filter((p) => p.paid_at && now - new Date(p.paid_at).getTime() < 24 * HOUR);
  const readings = [
    ...quotes.map((p) => readSla(p.created_at, SLA.quote.target, SLA.quote.escalate, now)),
    ...assignment.map((p) => readSla(p.paid_at, SLA.assignment.target, SLA.assignment.escalate, now)),
  ];
  const due = dueByHour(
    [
      ...quotes.map((p) => new Date(p.created_at).getTime() + SLA.quote.target),
      ...assignment.map((p) => new Date(p.paid_at!).getTime() + SLA.assignment.target),
      ...(disb.data ?? []).map((d) => new Date(d.triggered_at).getTime() + SLA.disbursement.target),
      ...all.filter((p) => p.status === "awaiting_payment" && p.quote_expires_at).map((p) => new Date(p.quote_expires_at!).getTime()),
    ],
    now,
  );
  const lateQuotes = quotes.filter((p) => readSla(p.created_at, SLA.quote.target, SLA.quote.escalate, now)?.state !== "ok").length;

  return (
    <>
      <PageHeader
        eyebrow={today()}
        title="Dashboard"
        actions={
          <Button asChild variant="primary">
            <Link to="/quotes">
              Open quotes <ArrowRight />
            </Link>
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-5">
        <HeroCard
          name={me.full_name.split(" ")[0] ?? me.full_name}
          health={onTimeShare(readings)}
          lines={[
            { label: "Paid today", value: paidToday.length },
            { label: "To quote", value: quotes.length },
            { label: "To assign", value: assignment.length },
          ]}
        />
        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          <KpiStrip
            loading={projects.isLoading}
            items={[
              { label: "To quote", value: quotes.length, chip: lateQuotes ? { text: `${lateQuotes} late`, tone: "danger" } : undefined, to: "/quotes" },
              { label: "To assign", value: assignment.length, to: "/assignment" },
              { label: "Payouts", value: queuedPayout.length, foot: formatInr(sumMinor(queuedPayout.map((l) => l.net_inr))), to: "/disbursement" },
              { label: "Refunds", value: (refunds.data ?? []).filter((r) => r.status === "awaiting_execution").length, to: "/refunds" },
              { label: "Paid today", value: formatInr(sumMinor(paidToday.map((p) => p.quote_amount_inr))), to: "/ledger" },
            ]}
          />
          <DueChart data={due} />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel title="Quotes" actions={<Button asChild size="xs" variant="ghost"><Link to="/quotes">View all <ArrowRight /></Link></Button>} padded={false}>
          {quotes.length === 0 ? (
            <EmptyState title="No quotes waiting" />
          ) : (
            <ul className="divide-y divide-line-subtle">
              {quotes.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <Link to={`/quotes/${p.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-hover">
                    <Code>{p.code}</Code>
                    <CategoryBadge category={p.category} short />
                    <span className="min-w-0 flex-1 basis-40 truncate text-[13.5px] font-semibold">{p.title}</span>
                    {p.urgency !== "standard" ? <Pill tone={URGENCY[p.urgency].tone} dot={false}>{URGENCY[p.urgency].label}</Pill> : null}
                    <SlaClock since={p.created_at} target={SLA.quote.target} escalate={SLA.quote.escalate} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Supervisor load" padded={false}>
          <ul className="divide-y divide-line-subtle">
            {supervisors.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", s.on_duty ? "bg-success-dot" : "bg-neutral-dot")} role="img" aria-label={s.on_duty ? "On duty" : "Off duty"} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{s.full_name}</span>
                  <span className="block truncate text-[11.5px] text-ink-3">{s.categories.join(", ")}</span>
                </span>
                <LoadMeter value={s.active_project_count} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="Projects by stage">
          <SplitBar
            parts={[
              { label: "Quoting", value: quotes.length, className: "bg-warning-dot" },
              { label: "Awaiting payment", value: all.filter((p) => p.status === "awaiting_payment").length, className: "bg-info-dot" },
              { label: "In progress", value: all.filter((p) => p.status === "in_progress").length, className: "bg-primary" },
              { label: "Quality check", value: all.filter((p) => p.status === "in_review").length, className: "bg-violet-dot" },
              { label: "Delivered", value: all.filter((p) => p.status === "delivered").length, className: "bg-success-dot" },
            ]}
          />
        </Panel>
        <Panel title="Waiting on you">
          <div className="grid grid-cols-2 gap-3">
            <Link to="/verification" className="rounded-xl border border-line-card p-3 hover:bg-hover">
              <div className="text-xs text-ink-3">Doer checks</div>
              <div className="font-mono text-2xl font-semibold tabular">{(verification.data ?? []).filter((v) => v.stage === "document_check" || v.stage === "awaiting_supervisor").length}</div>
            </Link>
            <Link to="/moderation" className="rounded-xl border border-line-card p-3 hover:bg-hover">
              <div className="text-xs text-ink-3">Messages on hold</div>
              <div className="font-mono text-2xl font-semibold tabular">{(held.data ?? []).length}</div>
            </Link>
          </div>
        </Panel>
        <Panel title="Waiting for payment" padded={false}>
          <ul className="divide-y divide-line-subtle">
            {all.filter((p) => p.status === "awaiting_payment").map((p) => (
              <li key={p.id}>
                <Link to={`/quotes/${p.id}`} className="flex items-center gap-2 px-4 py-2.5 hover:bg-hover">
                  <Code>{p.code}</Code>
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{p.title}</span>
                  {p.quote_expires_at ? <SlaClock deadline={p.quote_expires_at} warnWithin={24 * HOUR} /> : <Pill dot={false}>No expiry</Pill>}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

export function LoadMeter({ value }: { value: number }) {
  const near = value > 4;
  return (
    <span className="flex shrink-0 items-center gap-2">
      <span className="flex gap-0.5" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} className={cn("h-3 w-1.5 rounded-full", i < value ? (near ? "bg-warning-dot" : "bg-primary") : "bg-subtle")} />
        ))}
      </span>
      <span className={cn("tabular w-14 text-right text-xs font-semibold", near ? "text-warning-ink" : "text-ink-muted")}>{value} active</span>
    </span>
  );
}

/* Support ------------------------------------------------------------ */

function SupportOverview() {
  const me = useMe();
  const tickets = useTickets();
  const held = useHeld();
  const now = useNow();
  const open = (tickets.data ?? []).filter((t) => TICKET_STATUS[t.status].open).sort((a, b) => TICKET_PRIORITY[a.priority].rank - TICKET_PRIORITY[b.priority].rank);
  const unowned = open.filter((t) => !t.owner_id);
  const mine = open.filter((t) => t.owner_id === me.id);
  const awaitingFirst = open.filter((t) => !t.first_response_at);
  const readings = awaitingFirst.map((t) => readSla(t.created_at, TICKET_PRIORITY[t.priority].firstResponse, TICKET_PRIORITY[t.priority].firstResponse * 1.5, now));
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = ["8a", "10a", "12p", "2p", "4p", "6p", "8p", "10p"];
  // Demo pattern until the backend sends real intake history.
  const heat = days.map((_, d) => hours.map((__, h) => ((d * 7 + h * 3) % 5) + (h > 1 && h < 6 ? 2 : 0) + (d < 5 ? 1 : 0)));

  return (
    <>
      <PageHeader
        eyebrow={today()}
        title="Dashboard"
        actions={
          <Button asChild variant="primary">
            <Link to="/tickets">
              Open tickets <ArrowRight />
            </Link>
          </Button>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-5">
        <HeroCard
          name={me.full_name.split(" ")[0] ?? me.full_name}
          health={onTimeShare(readings)}
          lines={[
            { label: "Open", value: open.length },
            { label: "Mine", value: mine.length },
            { label: "Unassigned", value: unowned.length },
          ]}
        />
        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          <KpiStrip
            loading={tickets.isLoading}
            items={[
              { label: "Open", value: open.length, to: "/tickets" },
              { label: "Unassigned", value: unowned.length, chip: unowned.length ? { text: "Pick up", tone: "warning" } : undefined, to: "/tickets" },
              { label: "No reply yet", value: awaitingFirst.length, chip: awaitingFirst.some((t) => t.priority === "critical") ? { text: "Urgent", tone: "danger" } : undefined, to: "/tickets" },
              { label: "Mine", value: mine.length, to: "/tickets" },
            ]}
          />
          <Panel title="When tickets come in" sub="Sample data">
            <div className="overflow-x-auto">
              <DotMatrix className="min-w-[360px]" rows={heat} rowLabels={days} colLabels={hours} ariaLabel="Tickets by day and hour" />
            </div>
          </Panel>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Panel title="Most urgent" padded={false} actions={<Button asChild size="xs" variant="ghost"><Link to="/tickets">View all <ArrowRight /></Link></Button>}>
          {open.length === 0 ? (
            <EmptyState title="No open tickets" />
          ) : (
            <ul className="divide-y divide-line-subtle">
              {open.slice(0, 7).map((t) => (
                <li key={t.id}>
                  <Link to={`/tickets/${t.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 transition-colors hover:bg-hover">
                    <Code>{t.reference}</Code>
                    <span className="min-w-0 flex-1 basis-40 truncate text-[13.5px] font-semibold">{t.subject}</span>
                    <Pill tone={TICKET_PRIORITY[t.priority].tone}>{TICKET_PRIORITY[t.priority].label}</Pill>
                    {!t.first_response_at ? <SlaClock since={t.created_at} target={TICKET_PRIORITY[t.priority].firstResponse} escalate={TICKET_PRIORITY[t.priority].firstResponse * 1.5} /> : <Pill tone={TICKET_STATUS[t.status].tone}>{TICKET_STATUS[t.status].label}</Pill>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Messages on hold" padded={false}>
          {(held.data ?? []).length === 0 ? (
            <EmptyState icon={<ShieldAlert />} title="Nothing on hold" />
          ) : (
            <ul className="divide-y divide-line-subtle">
              {(held.data ?? []).map((h) => (
                <li key={h.message.id}>
                  <Link to="/moderation" className="flex items-center gap-3 px-4 py-3 hover:bg-hover">
                    <Code>{h.project.code}</Code>
                    <span className="min-w-0 flex-1 truncate text-[13px]">{h.message.sender_label}: {h.message.body}</span>
                    <SlaClock since={h.message.created_at} target={SLA.moderation.target} escalate={SLA.moderation.escalate} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

/* Activity ----------------------------------------------------------- */

const ACTIVITY_TONE: Partial<Record<ActivityEvent["kind"], string>> = {
  flag: "bg-danger-dot",
  message_held: "bg-warning-dot",
  delivered: "bg-success-dot",
  approved: "bg-success-dot",
  payout: "bg-success-dot",
  paid: "bg-info-dot",
};

export function ActivityPanel({ scope }: { scope?: string[] }) {
  const { data, isLoading } = useActivity();
  // With a scope (supervisors), events with no project of theirs are left out.
  const items = (data ?? []).filter((e) => !scope || (e.project_code !== null && scope.includes(e.project_code))).slice(0, 12);
  return (
    <Panel title="Recent activity" padded={false} className="self-start">
      {isLoading ? (
        <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-8" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState title="Nothing yet" />
      ) : (
        <ol className="max-h-[420px] overflow-y-auto px-4 py-2">
          {items.map((e) => (
            <li key={e.id} className="flex gap-3 py-2">
              <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", ACTIVITY_TONE[e.kind] ?? "bg-neutral-dot")} aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-[13px] leading-snug text-ink">
                  {e.project_code ? <Code className="mr-1.5">{e.project_code}</Code> : null}
                  {e.text}
                </div>
                <div className="text-[11.5px] text-ink-3">
                  {e.actor_label} · {formatRelative(e.created_at)}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

