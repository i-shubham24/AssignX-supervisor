import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ArrowLeft, Clock, RotateCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMoney, type Currency } from "@/lib/money";
import { readSla, readDeadline, type SlaReading } from "@/lib/sla";
import { Button } from "@/components/ui/button";
import { toUserError } from "@/lib/user-error";

const EASE = [0.16, 1, 0.3, 1] as const;

/* Page header --------------------------------------------------------- */

export function PageHeader({
  title,
  sub,
  actions,
  back,
  eyebrow,
  className,
}: {
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  back?: { to: string; label: string };
  eyebrow?: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.header
      className={cn("mb-5 flex flex-wrap items-end justify-between gap-4", className)}
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <div className="min-w-0">
        {back ? (
          <Link to={back.to} className="group mb-1.5 inline-flex items-center gap-1 text-xs font-semibold text-ink-muted transition-colors hover:text-ink">
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
            {back.label}
          </Link>
        ) : null}
        {eyebrow ? <div className="mb-1.5 flex flex-wrap items-center gap-2 text-[13px] font-medium text-ink-3">{eyebrow}</div> : null}
        <h1 className="flex flex-wrap items-center gap-3 text-[22px] font-extrabold leading-[1.2] tracking-[-0.03em] text-ink sm:text-[26px]">{title}</h1>
        {sub ? <p className="mt-1 max-w-3xl text-[13.5px] text-ink-muted">{sub}</p> : null}
      </div>
      {actions ? <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">{actions}</div> : null}
    </motion.header>
  );
}

/* Panel --------------------------------------------------------------- */

export function Panel({
  title,
  sub,
  actions,
  children,
  className,
  bodyClassName,
  padded = true,
  tone,
}: {
  title?: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  padded?: boolean;
  tone?: "client" | "doer" | "warning" | "danger";
}) {
  const accent =
    tone === "client" ? "before:bg-client" : tone === "doer" ? "before:bg-doer" : tone === "warning" ? "before:bg-warning-dot" : tone === "danger" ? "before:bg-danger-dot" : "";
  return (
    <section
      className={cn(
        "relative min-w-0 overflow-hidden rounded-2xl border border-line-card bg-surface shadow-soft-sm",
        tone && "before:absolute before:inset-x-0 before:top-0 before:h-[3px]",
        accent,
        className,
      )}
    >
      {title || actions ? (
        <header className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line-subtle px-4 py-3">
          <div className="min-w-0">
            {title ? <h2 className="text-[14px] font-bold tracking-[-0.01em] text-ink">{title}</h2> : null}
            {sub ? <p className="mt-0.5 text-xs text-ink-3">{sub}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
        </header>
      ) : null}
      <div className={cn(padded && "p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/* Stat card ----------------------------------------------------------- */

export function StatCard({
  label,
  value,
  foot,
  to,
  tone = "neutral",
  icon,
  loading,
}: {
  label: string;
  value: React.ReactNode;
  foot?: React.ReactNode;
  to?: string;
  tone?: "neutral" | "primary" | "warning" | "danger";
  icon?: React.ReactNode;
  loading?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="pt-1 text-[13px] font-medium text-ink-muted">{label}</span>
        {icon ? (
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full border [&>svg]:h-4 [&>svg]:w-4",
              tone === "primary" ? "border-primary/20 bg-primary-light text-primary" : tone === "warning" ? "border-warning-dot/25 bg-warning-bg text-warning-ink" : tone === "danger" ? "border-danger-dot/25 bg-danger-bg text-danger-ink" : "border-line-card bg-surface-2 text-ink-muted",
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div className="mt-3 text-[30px] font-bold leading-none tracking-[-0.03em] tabular text-ink">
        {loading ? <span className="skeleton inline-block h-8 w-16 align-middle" aria-hidden="true" /> : value}
      </div>
      {foot ? <div className="mt-2 text-xs font-medium text-ink-3">{foot}</div> : null}
    </>
  );
  const cls = cn(
    "block min-w-0 rounded-2xl border border-line-card bg-surface p-5 shadow-soft-sm transition-[box-shadow,border-color,transform] duration-200",
    to && "hover:-translate-y-0.5 hover:border-line hover:shadow-soft-md",
    tone === "danger" && "border-danger-dot/30",
  );
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/* States -------------------------------------------------------------- */

export function EmptyState({ icon, title, body, action, className }: { icon?: React.ReactNode; title: string; body?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      {icon ? (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light text-primary [&>svg]:h-5 [&>svg]:w-5" aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <p className="text-[15px] font-bold text-ink">{title}</p>
      {body ? <div className="mt-1 max-w-sm text-[13px] leading-relaxed text-ink-muted">{body}</div> : null}
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-12 text-center", className)}>
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-danger-bg text-danger-ink" aria-hidden="true">
        <AlertTriangle className="h-5 w-5" />
      </span>
      <p className="text-[15px] font-bold text-ink">This didn't load</p>
      <p className="mt-1 max-w-sm text-[13px] text-ink-muted">{toUserError(error, "Something went wrong on our side.")}</p>
      {onRetry ? (
        <Button className="mt-4" size="sm" onClick={onRetry}>
          <RotateCw /> Try again
        </Button>
      ) : null}
    </div>
  );
}

export function SkeletonRows({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("divide-y divide-line-subtle", className)} aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3.5">
          <span className="skeleton h-4 w-20" />
          <span className="skeleton h-4 flex-1" style={{ maxWidth: `${60 - (i % 3) * 12}%` }} />
          <span className="skeleton h-5 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* Money --------------------------------------------------------------- */

export function Money({ amount, currency = "INR", className, precise }: { amount: number | null | undefined; currency?: Currency; className?: string; precise?: boolean }) {
  if (amount === null || amount === undefined) return <span className={cn("text-ink-3", className)}>Not set</span>;
  return <span className={cn("tabular font-semibold", className)}>{formatMoney(amount, currency, { precise })}</span>;
}

/* SLA clock ------------------------------------------------------------ */

function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export { useNow };

const SLA_STYLE: Record<SlaReading["state"], string> = {
  ok: "bg-neutral-bg text-neutral-ink",
  due_soon: "bg-warning-bg text-warning-ink",
  breached: "bg-danger-bg text-danger-ink",
  escalated: "bg-danger-ink text-inverse",
};

export function SlaClock({
  since,
  target,
  escalate,
  deadline,
  warnWithin,
  className,
}: {
  since?: string | null;
  target?: number;
  escalate?: number;
  deadline?: string | null;
  warnWithin?: number;
  className?: string;
}) {
  const now = useNow();
  const reading = deadline !== undefined ? readDeadline(deadline, warnWithin ?? 0, now) : readSla(since, target ?? 0, escalate ?? Infinity, now);
  if (!reading) return <span className="text-xs text-ink-3">No deadline</span>;
  return (
    <span className={cn("inline-flex h-[22px] items-center gap-1 whitespace-nowrap rounded-md px-1.5 text-[11.5px] font-semibold tabular", SLA_STYLE[reading.state], className)}>
      <Clock className="h-3 w-3" aria-hidden="true" />
      {reading.label}
      {reading.state === "escalated" ? <span className="sr-only">, escalated to lead</span> : null}
    </span>
  );
}

/* Small pieces -------------------------------------------------------- */

export function KeyValue({ items, className, cols = 2 }: { items: { k: React.ReactNode; v: React.ReactNode }[]; className?: string; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3", cols === 1 ? "grid-cols-1" : cols === 2 ? "grid-cols-1 min-[420px]:grid-cols-2" : "grid-cols-2 sm:grid-cols-3", className)}>
      {items.map((item, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-[11.5px] font-semibold uppercase tracking-[0.05em] text-ink-3">{item.k}</dt>
          <dd className="mt-0.5 text-sm text-ink">{item.v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProgressBar({ value, className, tone = "primary" }: { value: number | null; className?: string; tone?: "primary" | "success" | "warning" }) {
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-subtle", className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-[var(--ease-spring)]", tone === "success" ? "bg-success-dot" : tone === "warning" ? "bg-warning-dot" : "bg-primary")}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  "aria-label": ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; count?: number }[];
  className?: string;
  "aria-label": string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn("inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-line-card bg-surface-2 p-0.5 [scrollbar-width:none]", className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[13px] font-semibold transition-colors",
              active ? "text-ink" : "text-ink-muted hover:text-ink",
            )}
          >
            {active ? <motion.span layoutId={`seg-${ariaLabel}`} className="absolute inset-0 rounded-full bg-surface shadow-soft-sm ring-1 ring-line-card" transition={{ type: "spring", stiffness: 500, damping: 38 }} /> : null}
            <span className="relative">{o.label}</span>
            {o.count !== undefined ? (
              <span className={cn("relative rounded px-1 text-[11px] tabular", active ? "bg-primary-light text-primary-ink" : "bg-subtle text-ink-3")}>{o.count}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function Avatar({ name, className, tone = "neutral" }: { name: string; className?: string; tone?: "neutral" | "primary" | "client" | "doer" }) {
  const initials = name
    .replace(/^R-/, "")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const styles = tone === "primary" ? "bg-primary text-inverse" : tone === "client" ? "bg-client-light text-client-ink" : tone === "doer" ? "bg-doer-light text-doer-ink" : "bg-subtle text-ink-2";
  return (
    <span className={cn("inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11.5px] font-bold", styles, className)} aria-hidden="true">
      {initials}
    </span>
  );
}

export function DemoNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-violet-dot/40 bg-violet-bg/60 px-3 py-2 text-xs text-violet-ink", className)}>
      <span className="rounded bg-violet-ink px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-inverse">Demo</span>
      {children}
    </div>
  );
}
