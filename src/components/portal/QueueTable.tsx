import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/cn";
import { EmptyState, ErrorState, SkeletonRows } from "./kit";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** Return a comparable value to make the column sortable. */
  sort?: (row: T) => string | number;
  className?: string;
  align?: "left" | "right";
  width?: string;
}

/**
 * The dense list every queue uses (PRD component inventory: queue row). Rows open
 * with a click or Enter; sorting is local. Queue order defaults to whatever the page
 * passes in, which is always SLA risk first.
 */
export function QueueTable<T>({
  rows,
  columns,
  rowKey,
  href,
  loading,
  error,
  onRetry,
  empty,
  rowClassName,
  caption,
}: {
  rows: T[] | undefined;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  href?: (row: T) => string;
  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty: { icon?: React.ReactNode; title: string; body?: React.ReactNode; action?: React.ReactNode };
  rowClassName?: (row: T) => string | undefined;
  caption: string;
}) {
  const navigate = useNavigate();
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);

  const sorted = useMemo(() => {
    if (!rows || !sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sort) return rows;
    return [...rows].sort((a, b) => {
      const va = col.sort!(a);
      const vb = col.sort!(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
  }, [rows, sort, columns]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && (active.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const queueRows = Array.from(document.querySelectorAll<HTMLElement>("[data-queue-row]"));
      if (!queueRows.length) return;

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        const currentIndex = queueRows.findIndex((r) => r === active || r.contains(active));
        const nextIndex = currentIndex === -1 ? 0 : Math.min(queueRows.length - 1, currentIndex + 1);
        queueRows[nextIndex]?.focus();
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        const currentIndex = queueRows.findIndex((r) => r === active || r.contains(active));
        const prevIndex = currentIndex === -1 ? 0 : Math.max(0, currentIndex - 1);
        queueRows[prevIndex]?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (error) return <ErrorState error={error} onRetry={onRetry} />;
  if (loading || !sorted) return <SkeletonRows rows={6} />;
  if (sorted.length === 0) return <EmptyState {...empty} />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line-subtle bg-surface-2">
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  scope="col"
                  style={c.width ? { width: c.width } : undefined}
                  className={cn("h-9 px-4 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3", c.align === "right" && "text-right", c.className)}
                  aria-sort={active ? (sort?.dir === 1 ? "ascending" : "descending") : undefined}
                >
                  {c.sort ? (
                    <button
                      type="button"
                      onClick={() => setSort((s) => (s?.key === c.key ? (s.dir === 1 ? { key: c.key, dir: -1 } : null) : { key: c.key, dir: 1 }))}
                      className={cn("inline-flex items-center gap-1 uppercase hover:text-ink", active && "text-ink")}
                    >
                      {c.header}
                      {active ? sort?.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : null}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-line-subtle">
          {sorted.map((row) => {
            const to = href?.(row);
            return (
              <tr
                key={rowKey(row)}
                tabIndex={to ? 0 : undefined}
                data-queue-row={to ? "true" : undefined}
                onClick={to ? () => navigate(to) : undefined}
                onKeyDown={
                  to
                    ? (e) => {
                        // Enter opens; j/k or the arrow keys move between rows.
                        if (e.key === "Enter") navigate(to);
                        const row = e.currentTarget;
                        const next = e.key === "ArrowDown" || e.key === "j" ? row.nextElementSibling : e.key === "ArrowUp" || e.key === "k" ? row.previousElementSibling : null;
                        if (next instanceof HTMLElement) {
                          e.preventDefault();
                          next.focus();
                        }
                      }
                    : undefined
                }
                className={cn(
                  "group transition-colors",
                  to && "cursor-pointer hover:bg-hover focus-visible:bg-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-inset",
                  rowClassName?.(row),
                )}
              >
                {columns.map((c) => (
                  <td key={c.key} className={cn("px-4 py-3 align-middle text-[13.5px]", c.align === "right" && "text-right", c.className)}>
                    {c.cell(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
