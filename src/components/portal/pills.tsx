import { cn } from "@/lib/cn";
import { CATEGORIES, STATUS, URGENCY, type Tone } from "@/lib/config";
import type { CategorySlug, ProjectStatus, Urgency } from "@/types/domain";

const TONE: Record<Tone, string> = {
  neutral: "bg-neutral-bg text-neutral-ink",
  info: "bg-info-bg text-info-ink",
  success: "bg-success-bg text-success-ink",
  warning: "bg-warning-bg text-warning-ink",
  danger: "bg-danger-bg text-danger-ink",
  violet: "bg-violet-bg text-violet-ink",
  primary: "bg-primary-light text-primary-ink",
};

const DOT: Record<Tone, string> = {
  neutral: "bg-neutral-dot",
  info: "bg-info-dot",
  success: "bg-success-dot",
  warning: "bg-warning-dot",
  danger: "bg-danger-dot",
  violet: "bg-violet-dot",
  primary: "bg-primary",
};

/** Status is never colour alone: every pill carries its text label (NFR-032). */
export function Pill({ tone = "neutral", dot = true, pulse = false, className, children }: { tone?: Tone; dot?: boolean; pulse?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11.5px] font-semibold", TONE[tone], className)}>
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", DOT[tone], pulse && "animate-[pulse-dot_1.6s_ease-in-out_infinite]")} aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

export function StatusPill({ status, className }: { status: ProjectStatus; className?: string }) {
  const s = STATUS[status];
  return (
    <Pill tone={s.tone} className={className}>
      {s.label}
    </Pill>
  );
}

export function UrgencyPill({ urgency, hideStandard = false }: { urgency: Urgency; hideStandard?: boolean }) {
  if (hideStandard && urgency === "standard") return null;
  const u = URGENCY[urgency];
  return (
    <Pill tone={u.tone} dot={false} className="uppercase tracking-[0.04em] text-[10.5px]">
      {u.label}
    </Pill>
  );
}

const CATEGORY_TINT: Record<CategorySlug, string> = {
  writing: "bg-[#eef4ff] text-[#2f4fb5]",
  design: "bg-[#fdf0f7] text-[#a3306f]",
  creative: "bg-[#fff3e8] text-[#a8521a]",
  it: "bg-[#ecf8f3] text-[#1d7a55]",
  ai: "bg-[#f2efff] text-[#5a3ec8]",
  marketing: "bg-[#fff8e1] text-[#8a6100]",
  research: "bg-[#eaf6fb] text-[#1f6a8a]",
  other: "bg-neutral-bg text-neutral-ink",
};

export function CategoryBadge({ category, short = false, className }: { category: CategorySlug; short?: boolean; className?: string }) {
  const c = CATEGORIES[category];
  return (
    <span className={cn("inline-flex h-[22px] shrink-0 items-center whitespace-nowrap rounded-md px-1.5 text-[11.5px] font-semibold", CATEGORY_TINT[category], className)}>
      {short ? c.short : c.label}
    </span>
  );
}

/** Marks which side of the anonymity boundary something faces. */
export function SideTag({ side, children, className }: { side: "client" | "doer" | "internal"; children?: React.ReactNode; className?: string }) {
  const styles =
    side === "client" ? "bg-client-light text-client-ink" : side === "doer" ? "bg-doer-light text-doer-ink" : "bg-neutral-bg text-neutral-ink";
  const label = children ?? (side === "client" ? "Client sees this" : side === "doer" ? "Doer sees this" : "Internal only");
  return <span className={cn("inline-flex h-5 items-center rounded px-1.5 text-[10.5px] font-bold uppercase tracking-[0.05em]", styles, className)}>{label}</span>;
}

export function Code({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[12px] font-medium tracking-tight text-ink-muted", className)}>{children}</span>;
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-card bg-surface-2 px-1 font-mono text-[10.5px] font-medium text-ink-muted">
      {children}
    </kbd>
  );
}
