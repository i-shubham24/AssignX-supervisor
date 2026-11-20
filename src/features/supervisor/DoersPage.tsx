import { useMemo, useState } from "react";
import { Search, Star, UsersRound } from "lucide-react";
import { useDoers } from "@/api/hooks";
import { PageHeader, Panel } from "@/components/portal/kit";
import { QueueTable } from "@/components/portal/QueueTable";
import { CategoryBadge, Code, Pill } from "@/components/portal/pills";
import { Input } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/field";
import { CATEGORIES, CATEGORY_SLUGS, DOER_CONCURRENCY_CAP } from "@/lib/config";
import type { CategorySlug, Doer } from "@/types/domain";
import { formatRelative } from "@/lib/datetime";
import { cn } from "@/lib/cn";

const VERIFICATION_TONE = { verified: "success", submitted: "warning", unverified: "neutral", rejected: "danger" } as const;

/** The verified doer pool, searchable by every filter the PRD lists (11.2). */
export default function DoersPage() {
  const { data, isLoading, error, refetch } = useDoers();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CategorySlug | "all">("all");
  const [level, setLevel] = useState<"all" | "1" | "2" | "3">("all");
  const [availability, setAvailability] = useState<"all" | "available">("all");
  const [minRating, setMinRating] = useState<"0" | "4" | "4.5">("0");
  const [hasCapacity, setHasCapacity] = useState(false);
  const [workedWith, setWorkedWith] = useState(false);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data ?? [])
      .filter((d) => cat === "all" || d.fields.includes(cat))
      .filter((d) => level === "all" || String(d.level) === level)
      .filter((d) => availability === "all" || d.availability === "available")
      .filter((d) => (d.average_rating ?? 0) >= Number(minRating))
      .filter((d) => !hasCapacity || d.active_project_count < DOER_CONCURRENCY_CAP)
      .filter((d) => !workedWith || d.worked_with_me)
      .filter((d) => !term || d.doer_code.toLowerCase().includes(term) || d.full_name.toLowerCase().includes(term) || d.sub_categories.some((s) => s.toLowerCase().includes(term)));
  }, [data, q, cat, level, availability, minRating, hasCapacity, workedWith]);

  return (
    <>
      <PageHeader title="Doers" sub="Only verified doers can get offers." />
      <Panel padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-line-subtle p-3">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Code, name or skill" className="h-8 pl-9" aria-label="Search doers" />
          </div>
          <Select size="sm" className="w-full sm:w-48" aria-label="Category" value={cat} onChange={setCat} options={[{ value: "all", label: "All categories" }, ...CATEGORY_SLUGS.map((c) => ({ value: c, label: CATEGORIES[c].label }))]} />
          <Select size="sm" className="w-full sm:w-32" aria-label="Level" value={level} onChange={setLevel} options={[{ value: "all", label: "All levels" }, { value: "1", label: "Level 1" }, { value: "2", label: "Level 2" }, { value: "3", label: "Level 3" }]} />
          <Select size="sm" className="w-full sm:w-36" aria-label="Rating" value={minRating} onChange={setMinRating} options={[{ value: "0", label: "Any rating" }, { value: "4", label: "4.0 and above" }, { value: "4.5", label: "4.5 and above" }]} />
          <Select size="sm" className="w-full sm:w-36" aria-label="Availability" value={availability} onChange={setAvailability} options={[{ value: "all", label: "Any availability" }, { value: "available", label: "Available now" }]} />
          <Checkbox checked={hasCapacity} onChange={setHasCapacity} label="Has a free slot" />
          <Checkbox checked={workedWith} onChange={setWorkedWith} label="Worked with me" />
          <span className="ml-auto text-xs text-ink-3">{rows.length} doers</span>
        </div>
        <QueueTable<Doer>
          caption="Doers"
          rows={isLoading ? undefined : rows}
          loading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          rowKey={(d) => d.id}
          href={(d) => `/doers/${d.id}`}
          empty={{ icon: <UsersRound />, title: "No doers match", body: "Try clearing a filter." }}
          columns={[
            {
              key: "doer",
              header: "Doer",
              sort: (d) => d.doer_code,
              cell: (d) => (
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-doer-light font-mono text-[11px] font-bold text-doer-ink">L{d.level}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><Code className="text-ink">{d.doer_code}</Code>{d.worked_with_me ? <Pill tone="success" dot={false} className="h-[18px] text-[10.5px]">Worked with you</Pill> : null}</div>
                    <div className="truncate text-[13px] font-semibold">{d.full_name}</div>
                  </div>
                </div>
              ),
            },
            { key: "fields", header: "Disciplines", cell: (d) => <div className="flex flex-wrap gap-1">{d.fields.map((f) => <CategoryBadge key={f} category={f} short />)}<span className="block w-full truncate text-[11.5px] text-ink-3">{d.sub_categories.join(", ")}</span></div> },
            { key: "rating", header: "Rating", width: "100px", sort: (d) => d.average_rating ?? 0, cell: (d) => <span className="flex items-center gap-1 font-semibold"><Star className="h-3.5 w-3.5 fill-warning-dot text-warning-dot" aria-hidden="true" />{d.average_rating?.toFixed(1) ?? "New"}</span> },
            { key: "done", header: "Completed", width: "110px", sort: (d) => d.projects_completed, cell: (d) => <span className="tabular">{d.projects_completed}</span> },
            {
              key: "load",
              header: "Load",
              width: "120px",
              sort: (d) => d.active_project_count,
              cell: (d) => (
                <span className="flex items-center gap-1.5">
                  {Array.from({ length: DOER_CONCURRENCY_CAP }).map((_, i) => (
                    <span key={i} className={cn("h-2.5 w-5 rounded-full", i < d.active_project_count ? (d.active_project_count >= DOER_CONCURRENCY_CAP ? "bg-danger-dot" : "bg-doer") : "bg-subtle")} />
                  ))}
                  <span className="sr-only">{d.active_project_count} of {DOER_CONCURRENCY_CAP}</span>
                </span>
              ),
            },
            { key: "avail", header: "Status", width: "130px", cell: (d) => <div className="flex flex-col items-start gap-1"><Pill tone={VERIFICATION_TONE[d.verification_status]}>{d.verification_status}</Pill><span className="text-[11px] text-ink-3">{d.availability}, {formatRelative(d.last_active_at)}</span></div> },
          ]}
        />
      </Panel>
    </>
  );
}
