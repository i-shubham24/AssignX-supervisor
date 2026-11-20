import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Project } from "@/types/domain";
import { RingGauge, BarChart, MiniBars, type BarDatum } from "@/components/portal/charts";
import { Avatar, ProgressBar, SlaClock } from "@/components/portal/kit";
import { CategoryBadge, Code, Pill, SideTag } from "@/components/portal/pills";
import { HOUR } from "@/lib/datetime";
import { isActiveDoer, needsWorkingLink, openFlags } from "@/features/projects/queues";
import { SLA } from "@/lib/config";

/* Hero card: the one filled coral card on a dashboard ---------------- */

export function HeroCard({ name, health, lines, cta }: { name: string; health: number; lines: { label: string; value: React.ReactNode }[]; cta?: { to: string; label: string } }) {
  return (
    <section className="relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line-card bg-[#0f172a] p-4 text-white shadow-soft-sm sm:p-5">
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/10 blur-2xl" />
      <div>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-0.5 text-[10.5px] font-semibold text-white/90">
            <span className="h-1.5 w-1.5 rounded-full bg-success-dot animate-pulse" /> Operations Core
          </span>
          <span className="text-[11px] font-medium text-white/50">Live</span>
        </div>
        <div className="mt-2 text-[18px] font-extrabold tracking-[-0.02em] text-white sm:text-[20px]">Hi, {name}</div>
        <div className="text-[12px] text-white/70">Queue health & delivery pace</div>
      </div>
      <div className="relative my-3 flex justify-center">
        <RingGauge value={health} light label={`${Math.round(health)}%`} sub="on time" size={136} />
      </div>
      <dl className="grid grid-cols-3 gap-1.5 rounded-xl bg-white/5 p-2 ring-1 ring-white/10">
        {lines.map((l) => (
          <div key={l.label} className="min-w-0 text-center">
            <dt className="truncate text-[10.5px] font-medium text-white/60">{l.label}</dt>
            <dd className="text-[15px] font-bold tabular text-white sm:text-[16px]">{l.value}</dd>
          </div>
        ))}
      </dl>
      {cta ? (
        <Link to={cta.to} className="relative mt-2.5 inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 py-1.5 text-[12px] font-semibold text-white transition-colors hover:bg-white/20">
          {cta.label} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : null}
    </section>
  );
}

/* KPI strip: connected cells with big numbers ------------------------ */

export interface Kpi {
  label: string;
  value: React.ReactNode;
  chip?: { text: string; tone: "neutral" | "warning" | "danger" | "success" | "primary" };
  foot?: React.ReactNode;
  to?: string;
  spark?: number[];
}

export function KpiStrip({ items, loading }: { items: Kpi[]; loading?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line-card bg-line-subtle shadow-soft-sm sm:grid-cols-3 xl:[grid-template-columns:repeat(var(--n),minmax(0,1fr))]" style={{ "--n": items.length } as React.CSSProperties}>
      {items.map((k) => {
        const body = (
          <>
            <div className="truncate text-[12px] font-semibold text-ink-muted sm:text-[12.5px]">
              {k.label}
            </div>
            <div className="mt-2.5 flex items-baseline justify-between gap-1.5">
              <div className="font-mono text-[24px] font-semibold leading-none tracking-[-0.04em] tabular text-ink sm:text-[26px]">
                {loading ? <span className="skeleton inline-block h-7 w-14 align-middle" aria-hidden="true" /> : k.value}
              </div>
              {k.chip ? <Pill tone={k.chip.tone} dot={false} className="h-4.5 px-1.5 text-[10px] sm:h-5 sm:text-[10.5px]">{k.chip.text}</Pill> : null}
              {k.spark ? <MiniBars values={k.spark} className="h-6 sm:h-7" /> : null}
            </div>
            {k.foot ? <div className="mt-1.5 truncate text-[11.5px] text-ink-3">{k.foot}</div> : null}
          </>
        );
        const cls = cn("block min-w-0 bg-surface px-4 py-3.5 transition-colors sm:px-5 sm:py-4", k.to && "hover:bg-hover");
        return k.to ? (
          <Link key={k.label} to={k.to} className={cls}>
            {body}
          </Link>
        ) : (
          <div key={k.label} className={cls}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

/* Due-soon chart ------------------------------------------------------ */

export function dueByHour(dueTimes: number[], now = Date.now()): BarDatum[] {
  const start = new Date(now);
  start.setMinutes(0, 0, 0);
  const fmt = new Intl.DateTimeFormat(undefined, { hour: "numeric" });
  return Array.from({ length: 12 }).map((_, i) => {
    const from = start.getTime() + i * HOUR;
    const to = from + HOUR;
    const count = dueTimes.filter((t) => (i === 0 ? t < to : t >= from && t < to)).length;
    return { label: i === 0 ? "Now" : fmt.format(from).replace(/\s/g, "").toLowerCase(), value: count, detail: count === 1 ? "item" : "items" };
  });
}

export function DueChart({ data, title = "Due in the next 12 hours" }: { data: BarDatum[]; title?: string }) {
  const peak = data.reduce((best, d, i) => (d.value > (data[best]?.value ?? -1) ? i : best), 0);
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <section className="flex min-w-0 flex-col rounded-2xl border border-line-card bg-surface p-4 shadow-soft-sm sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-bold tracking-[-0.01em]">{title}</h2>
          <p className="text-[11.5px] text-ink-3">Upcoming deadlines and deliverable checkpoints</p>
        </div>
        <div className="text-right">
          <div className="font-mono text-[20px] font-semibold leading-none tabular">{total}</div>
          <div className="mt-0.5 text-[10.5px] text-ink-3">due</div>
        </div>
      </div>
      <div className="w-full max-w-full min-w-0 overflow-x-auto">
        <BarChart data={data} highlight={peak} height={140} ariaLabel={`${title}: ${total} items`} className="w-full min-w-0" />
      </div>
    </section>
  );
}

/* To-do list --------------------------------------------------------- */

export interface TodoItem {
  key: string;
  icon: React.ReactNode;
  tone: "danger" | "warning" | "info";
  track?: "client" | "dolancer" | "general";
  code?: string;
  title: string;
  detail?: string;
  due?: React.ReactNode;
  to: string;
  cta: string;
}

export function TodoList({ items }: { items: TodoItem[] }) {
  return (
    <ul className="divide-y divide-line-subtle">
      {items.map((t) => {
        const tone = t.tone === "danger" ? "bg-danger-bg text-danger-ink" : t.tone === "warning" ? "bg-warning-bg text-warning-ink" : "bg-info-bg text-info-ink";
        return (
          <li key={t.key}>
            <Link to={t.to} className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-hover">
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full [&>svg]:h-4 [&>svg]:w-4", tone)} aria-hidden="true">
                {t.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {t.code ? <Code>{t.code}</Code> : null}
                  {t.track === "client" ? <SideTag side="client">Client</SideTag> : null}
                  {t.track === "dolancer" ? <SideTag side="doer">Dolancer</SideTag> : null}
                  <span className="text-[13px] font-semibold text-ink sm:text-[13.5px] break-words">{t.title}</span>
                </div>
                {t.detail ? <div className="mt-0.5 truncate text-[12px] text-ink-muted sm:text-[12.5px]">{t.detail}</div> : null}
              </div>
              {t.due ? <span className="hidden shrink-0 sm:block">{t.due}</span> : null}
              <span className="hidden shrink-0 items-center gap-0.5 text-[12.5px] font-bold text-primary-ink md:flex">
                {t.cta} <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-3 md:hidden" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/* Project cards ------------------------------------------------------ */

export function ProjectCard({ p, to }: { p: Project; to: string }) {
  const flags = openFlags(p);
  const action = flags.length
    ? `Flag ${p.flag_count} of 3 from client`
    : needsWorkingLink(p)
      ? "Add workspace link for dolancer"
      : p.status === "in_review"
        ? "Ready for quality check"
        : p.progress_updated_at && Date.now() - new Date(p.progress_updated_at).getTime() > SLA.progressStale
          ? "Dolancer check-in overdue"
          : null;
  const doers = p.doers.filter(isActiveDoer);
  return (
    <Link to={to} className="group flex min-w-0 flex-col rounded-2xl border border-line-card bg-surface p-4 shadow-soft-sm transition-[box-shadow,transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-line hover:shadow-soft-md">
      <div className="flex items-center gap-2">
        <Code>{p.code}</Code>
        <CategoryBadge category={p.category} short />
        <span className="ml-auto text-[12px] font-bold tabular text-ink-2">{p.progress_percent ?? 0}%</span>
      </div>
      <h3 className="mt-2 line-clamp-2 text-[14px] font-bold leading-snug tracking-[-0.01em] group-hover:text-primary-ink">{p.title}</h3>
      <div className="mt-2 flex items-center justify-between text-[11.5px] text-ink-3">
        <span className="truncate">Client: <b className="font-semibold text-ink-2">{p.client.display_name}</b> · {p.client.country}</span>
      </div>
      <ProgressBar value={p.progress_percent} className="mt-2.5" />
      <div className="mt-1.5 flex items-center justify-between text-[11.5px]">
        <span className="truncate text-ink-3">{p.progress_label ?? "Not started"}</span>
      </div>
      {action ? <div className={cn("mt-3 truncate rounded-lg px-2.5 py-1.5 text-[11.5px] font-semibold", flags.length ? "bg-danger-bg text-danger-ink" : "bg-warning-bg text-warning-ink")}>{action}</div> : null}
      <div className="mt-auto flex items-center gap-2 pt-3 border-t border-line-subtle mt-3">
        <div className="flex -space-x-1.5">
          {doers.length ? doers.map((d) => <Avatar key={d.id} name={d.doer_code} tone="doer" className="h-6 w-6 ring-2 ring-surface text-[10px]" />) : <Avatar name="?" className="h-6 w-6 text-[10px]" />}
        </div>
        <span className="truncate text-[11.5px] font-medium text-ink-2">Dolancer: {doers.map((d) => d.doer_code).join(", ") || "Unassigned"}</span>
        {p.deadline_utc ? <SlaClock className="ml-auto text-[11.5px]" deadline={p.deadline_utc} warnWithin={24 * HOUR} /> : null}
      </div>
    </Link>
  );
}
