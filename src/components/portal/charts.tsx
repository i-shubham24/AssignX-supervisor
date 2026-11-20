import { useId, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

/**
 * Small dependency-free charts for the live dashboards (inspired by the call-centre
 * and project dashboards the team referenced). Each one has a text alternative so
 * nothing is conveyed by the picture alone.
 */

/* Ring gauge --------------------------------------------------------- */

export function RingGauge({
  value,
  size = 168,
  stroke = 12,
  label,
  sub,
  className,
  light = false,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
  /** For use on a filled coral card. */
  light?: boolean;
}) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  const ticks = 48;
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }} role="img" aria-label={`${Math.round(v)} percent`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {Array.from({ length: ticks }).map((_, i) => {
          const a = (i / ticks) * Math.PI * 2;
          const inner = r - stroke - 6;
          const outer = r - stroke - 2;
          const cx = size / 2;
          return (
            <line
              key={i}
              x1={cx + inner * Math.cos(a)}
              y1={cx + inner * Math.sin(a)}
              x2={cx + outer * Math.cos(a)}
              y2={cx + outer * Math.sin(a)}
              stroke={light ? "rgba(255,255,255,0.28)" : "rgba(100, 116, 139, 0.3)"}
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          );
        })}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={light ? "rgba(255,255,255,0.2)" : "rgba(203, 213, 225, 0.8)"} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={light ? "#ffffff" : "var(--color-primary)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (v / 100) * c }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className={cn("text-[30px] font-bold leading-none tracking-[-0.03em] tabular", light ? "text-white" : "text-ink")}>{label}</div>
        {sub ? <div className={cn("mt-1 max-w-[70%] text-[11px] font-medium leading-tight", light ? "text-white/80" : "text-ink-3")}>{sub}</div> : null}
      </div>
    </div>
  );
}

/* Bar chart with a highlighted bar ----------------------------------- */

export interface BarDatum {
  label: string;
  value: number;
  /** Secondary stacked value, drawn lighter beneath the tooltip. */
  detail?: string;
}

export function BarChart({ data, highlight, height = 180, className, unit = "", ariaLabel }: { data: BarDatum[]; highlight?: number; height?: number; className?: string; unit?: string; ariaLabel: string }) {
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const active = hover ?? highlight ?? null;
  return (
    <figure className={cn("relative", className)}>
      <div className="flex items-end gap-1.5" style={{ height }} role="img" aria-label={ariaLabel}>
        {data.map((d, i) => {
          const h = Math.max(4, (d.value / max) * (height - 28));
          const isActive = active === i;
          return (
            <div key={d.label} className="relative flex h-full flex-1 flex-col items-center justify-end" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {isActive ? (
                <div className="absolute z-10 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-bold text-inverse shadow-soft-md" style={{ bottom: h + 8 }}>
                  {d.value}
                  {unit}
                  {d.detail ? <span className="ml-1 font-medium opacity-70">{d.detail}</span> : null}
                </div>
              ) : null}
              <motion.div
                className={cn("w-full rounded-t-md rounded-b-sm", isActive ? "bg-gradient-to-t from-primary-to to-primary-from" : "bg-primary/15")}
                initial={reduce ? false : { height: 0 }}
                animate={{ height: h }}
                transition={{ duration: 0.7, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }}
                style={isActive ? undefined : { backgroundImage: "repeating-linear-gradient(135deg, transparent 0 4px, rgba(238,107,80,0.12) 4px 6px)" }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-1.5">
        {data.map((d, i) => (
          <span key={d.label} className={cn("flex-1 text-center text-[10.5px] font-medium", active === i ? "text-ink" : "text-ink-3")}>
            {d.label}
          </span>
        ))}
      </div>
      <figcaption className="sr-only">
        {data.map((d) => `${d.label}: ${d.value}${unit}`).join(", ")}
      </figcaption>
    </figure>
  );
}

/* Mini bars (KPI decoration) ----------------------------------------- */

export function MiniBars({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className={cn("flex h-9 items-end gap-[3px]", className)} aria-hidden="true">
      {values.map((v, i) => (
        <span key={i} className={cn("w-[5px] rounded-full", i === values.length - 1 ? "bg-primary" : "bg-primary/25")} style={{ height: `${Math.max(12, (v / max) * 100)}%` }} />
      ))}
    </div>
  );
}

/* Dot matrix (workload by day and hour) ------------------------------ */

export function DotMatrix({ rows, rowLabels, colLabels, className, ariaLabel }: { rows: number[][]; rowLabels: string[]; colLabels: string[]; className?: string; ariaLabel: string }) {
  const id = useId();
  const max = Math.max(1, ...rows.flat());
  return (
    <figure className={className}>
      <div className="grid gap-y-1.5" style={{ gridTemplateColumns: `44px repeat(${colLabels.length}, minmax(0, 1fr))` }} role="img" aria-label={ariaLabel}>
        {rows.map((row, r) => (
          <div key={`${id}-${r}`} className="contents">
            <span className="self-center text-[10.5px] font-medium text-ink-3">{rowLabels[r]}</span>
            {row.map((v, c) => {
              const t = v / max;
              return (
                <span key={c} className="flex items-center justify-center" title={`${rowLabels[r]} ${colLabels[c]}: ${v}`}>
                  <span
                    className="block rounded-full"
                    style={{
                      width: 10,
                      height: 10,
                      background: t === 0 ? "var(--color-subtle)" : `color-mix(in srgb, var(--color-primary) ${Math.round(20 + t * 80)}%, transparent)`,
                    }}
                  />
                </span>
              );
            })}
          </div>
        ))}
        <span />
        {colLabels.map((l) => (
          <span key={l} className="pt-1 text-center text-[10px] font-medium text-ink-3">
            {l}
          </span>
        ))}
      </div>
    </figure>
  );
}

/* Stacked distribution bar -------------------------------------------- */

export function SplitBar({ parts, className }: { parts: { label: string; value: number; className: string }[]; className?: string }) {
  const total = Math.max(1, parts.reduce((s, p) => s + p.value, 0));
  return (
    <div className={className}>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-subtle" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
        {parts.map((p) => (
          <span key={p.label} className={cn("h-full", p.className)} style={{ width: `${(p.value / total) * 100}%` }} />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {parts.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5 text-[11.5px] text-ink-muted">
            <span className={cn("h-2 w-2 rounded-full", p.className)} aria-hidden="true" />
            {p.label} <b className="tabular text-ink">{p.value}</b>
          </span>
        ))}
      </div>
    </div>
  );
}
