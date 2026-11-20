import { useMemo, useState } from "react";
import { Search, Star, UserCheck } from "lucide-react";
import type { CategorySlug, Doer, Project } from "@/types/domain";
import { useAction, useDoers, useTraining } from "@/api/hooks";
import * as api from "@/api/portal";
import { useMe } from "@/providers/SessionProvider";
import { CATEGORIES, CATEGORY_SLUGS, DOER_CONCURRENCY_CAP, LEVEL_CUT } from "@/lib/config";
import { formatInr, minorToMajorString, parseMajorToMinor, percentOf } from "@/lib/money";
import { Dialog, DialogContent } from "@/components/ui/overlay";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { Code, Pill } from "@/components/portal/pills";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/datetime";

type AvailabilityFilter = "any" | "available";

/**
 * Offer a project, or one part of it, to a verified doer (PRD 11.2 doer sourcing).
 * Filters: category, level, rating, availability, load, previously worked with.
 * The payout is set by the supervisor; the level percentage is guidance only.
 */
export function OfferDialog({ project, open, onOpenChange }: { project: Project; open: boolean; onOpenChange: (v: boolean) => void }) {
  const me = useMe();
  const doers = useDoers();
  const training = useTraining();
  const [query, setQuery] = useState("");
  const [discipline, setDiscipline] = useState<CategorySlug>(project.category);
  const [level, setLevel] = useState<"any" | "1" | "2" | "3">("any");
  const [availability, setAvailability] = useState<AvailabilityFilter>("available");
  const [workedWith, setWorkedWith] = useState(false);
  const [selected, setSelected] = useState<Doer | null>(null);
  const [payout, setPayout] = useState("");
  const [scope, setScope] = useState("");
  const [moduleId, setModuleId] = useState<string>("none");
  const [error, setError] = useState<string | null>(null);

  const activeParts = project.doers.filter((d) => d.status === "accepted" || d.status === "completed" || d.status === "offered");
  // A new part only when this discipline has no open offer or doer yet; the backend
  // rejects a second offer for the same part either way.
  const additional = activeParts.length > 0 && !activeParts.some((d) => d.discipline === discipline);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (doers.data ?? [])
      .filter((d) => d.verification_status === "verified" && d.status === "active")
      .filter((d) => d.fields.includes(discipline))
      .filter((d) => level === "any" || String(d.level) === level)
      .filter((d) => availability === "any" || d.availability === "available")
      .filter((d) => !workedWith || d.worked_with_me)
      .filter((d) => !q || d.doer_code.toLowerCase().includes(q) || d.sub_categories.some((s) => s.toLowerCase().includes(q)))
      .sort((a, b) => Number(b.worked_with_me) - Number(a.worked_with_me) || (b.average_rating ?? 0) - (a.average_rating ?? 0));
  }, [doers.data, discipline, level, availability, workedWith, query]);

  const send = useAction(
    () => {
      if (!selected) {
        setError("Choose a doer first.");
        throw new Error("PORTAL: Choose a doer first.");
      }
      const amount = parseMajorToMinor(payout);
      if (amount === null || amount <= 0) {
        setError("Enter the payout in rupees, for example 6500.");
        throw new Error("PORTAL: Enter the payout in rupees, for example 6500.");
      }
      return api.sendOffer(
        project.id,
        { doer_id: selected.id, discipline, payout_amount_inr: amount, scope_note: scope, required_module_id: moduleId === "none" ? null : moduleId, as_additional_part: additional },
        me.id,
      );
    },
    {
      success: () => `Offer sent to ${selected?.doer_code}.`,
      onSuccess: () => {
        onOpenChange(false);
        setSelected(null);
        setPayout("");
        setScope("");
        setError(null);
      },
    },
  );

  const guidance = selected ? percentOf(project.quote_amount_inr ?? 0, LEVEL_CUT[selected.level]) : null;
  const atCap = selected ? selected.active_project_count >= DOER_CONCURRENCY_CAP : false;
  const modules = (training.data ?? []).filter((m) => m.state === "published" && m.audience !== "supervisor");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        wide
        className="max-w-4xl"
        title={additional ? "Offer another part" : "Offer to a doer"}
        description={`${project.code} · ${project.title}`}
        footer={
          <>
            <span className="mr-auto text-xs text-ink-3">Offer expires in 2 hours.</span>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={!selected || atCap} loading={send.isPending} onClick={() => { setError(null); send.mutate(undefined); }}>
              Send offer
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[180px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3" aria-hidden="true" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Doer code or skill" className="h-8 pl-8" aria-label="Search doers" />
              </div>
              <Select size="sm" className="w-full sm:w-44" aria-label="Discipline" value={discipline} onChange={setDiscipline} options={CATEGORY_SLUGS.map((c) => ({ value: c, label: CATEGORIES[c].label }))} />
              <Select size="sm" className="w-full sm:w-28" aria-label="Level" value={level} onChange={setLevel} options={[{ value: "any", label: "Any level" }, { value: "1", label: "Level 1" }, { value: "2", label: "Level 2" }, { value: "3", label: "Level 3" }]} />
              <Select size="sm" className="w-full sm:w-32" aria-label="Availability" value={availability} onChange={setAvailability} options={[{ value: "available", label: "Available" }, { value: "any", label: "Any status" }]} />
            </div>
            <Checkbox className="mt-2" checked={workedWith} onChange={setWorkedWith} label="Worked with me" />
            {doers.isLoading ? <div className="mt-2 space-y-1.5" aria-busy="true">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-16 rounded-lg" />)}</div> : null}
            {!doers.isLoading && list.length === 0 ? <p className="mt-2 rounded-lg border border-dashed border-line-card p-6 text-center text-sm text-ink-3">No doers match. Try fewer filters.</p> : null}
            <ul className="mt-2 max-h-[380px] space-y-1.5 overflow-y-auto pr-1" role="listbox" aria-label="Doers">
              {list.map((d) => {
                const full = d.active_project_count >= DOER_CONCURRENCY_CAP;
                const isSel = selected?.id === d.id;
                return (
                  <li key={d.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSel}
                      onClick={() => {
                        setSelected(d);
                        setPayout("");
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-[border-color,background-color]",
                        isSel ? "border-primary bg-primary-light/50 ring-2 ring-primary/15" : "border-line-card bg-surface hover:border-line",
                        full && "opacity-60",
                      )}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-doer-light font-mono text-[11px] font-bold text-doer-ink">L{d.level}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <Code className="text-ink">{d.doer_code}</Code>
                          {d.worked_with_me ? <Pill tone="success" dot={false} className="h-[18px] text-[10.5px]">Worked with you</Pill> : null}
                          {d.availability !== "available" ? <Pill tone="neutral" className="h-[18px] text-[10.5px]">{d.availability}</Pill> : null}
                        </span>
                        <span className="block truncate text-xs text-ink-muted">{d.sub_categories.join(", ")}</span>
                      </span>
                      <span className="shrink-0 text-right text-xs">
                        <span className="flex items-center justify-end gap-1 font-semibold">
                          <Star className="h-3 w-3 fill-warning-dot text-warning-dot" aria-hidden="true" />
                          {d.average_rating?.toFixed(1) ?? "New"}
                        </span>
                        <span className={cn("tabular block", full ? "font-semibold text-danger-ink" : "text-ink-3")}>
                          {d.active_project_count}/{DOER_CONCURRENCY_CAP} active · {d.projects_completed} done
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="min-w-0 space-y-4">
            {selected ? (
              <>
                <div className="rounded-lg border border-line-card bg-surface-2 p-3">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-doer" aria-hidden="true" />
                    <Code className="text-ink">{selected.doer_code}</Code>
                    <span className="text-xs text-ink-3">Level {selected.level} · active {formatRelative(selected.last_active_at)}</span>
                  </div>
                  <p className="mt-1.5 text-xs text-ink-muted">
                    The client sees this doer as <b>{CATEGORIES[discipline].expert}</b>.
                  </p>
                  {atCap ? <p className="mt-1.5 text-xs font-semibold text-danger-ink">Already at three projects. Choose someone else.</p> : null}
                </div>
                <Field
                  label="Doer payout (INR)"
                  required
                  error={error}
                  hint={guidance !== null ? `Level ${selected.level} guide: ${LEVEL_CUT[selected.level]}% of the quote, about ${formatInr(guidance)}.` : undefined}
                  aside={
                    guidance ? (
                      <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setPayout(minorToMajorString(guidance))}>
                        Use guide
                      </button>
                    ) : null
                  }
                >
                  {({ id, describedBy, invalid }) => (
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-3">₹</span>
                      <Input id={id} inputMode="decimal" value={payout} onChange={(e) => { setError(null); setPayout(e.target.value); }} placeholder="6500" className="pl-7 tabular" aria-describedby={describedBy} aria-invalid={invalid} />
                    </div>
                  )}
                </Field>
                {project.quote_amount_inr ? (
                  <MarginPreview quoteInr={project.quote_amount_inr - project.credits_applied_inr} otherPayouts={activeParts.filter((p) => p.status !== "offered").reduce((s, p) => s + p.payout_amount_inr, 0)} payout={parseMajorToMinor(payout) ?? 0} />
                ) : null}
                <Field label={additional ? "This doer's part" : "Scope note"} hint="What this doer will do. No client details.">
                  {({ id, describedBy }) => <Textarea id={id} value={scope} onChange={(e) => setScope(e.target.value)} rows={3} aria-describedby={describedBy} placeholder={additional ? "For example: all landing page copy and FAQ" : "Optional"} />}
                </Field>
                <Field label="Required training">
                  {({ id }) => (
                    <Select id={id} value={moduleId} onChange={setModuleId} options={[{ value: "none", label: "None" }, ...modules.map((m) => ({ value: m.id, label: m.title }))]} />
                  )}
                </Field>
              </>
            ) : (
              <div className="flex h-full min-h-60 flex-col items-center justify-center rounded-lg border border-dashed border-line-card p-6 text-center">
                <UserCheck className="h-6 w-6 text-ink-3" aria-hidden="true" />
                <p className="mt-2 text-sm font-semibold">Choose a doer</p>
                <p className="mt-1 text-xs text-ink-3">Past doers first, then by rating.</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Internal only: what this offer does to the project margin. Never client or doer facing. */
export function MarginPreview({ quoteInr, otherPayouts, payout }: { quoteInr: number; otherPayouts: number; payout: number }) {
  const margin = quoteInr - otherPayouts - payout;
  const pct = quoteInr ? Math.round((margin / quoteInr) * 100) : 0;
  return (
    <div className="rounded-lg border border-line-card p-3 text-xs">
      <div className="mb-2 flex items-center justify-between">
        <span className="font-bold uppercase tracking-[0.06em] text-ink-3">Margin</span>
        <Pill tone={pct < 45 ? "warning" : "success"} dot={false}>{pct}% margin</Pill>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-subtle">
        <span className="bg-doer" style={{ width: `${Math.min(100, ((otherPayouts + payout) / quoteInr) * 100)}%` }} />
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2 tabular">
        <span><span className="block text-ink-3">Quote</span>{formatInr(quoteInr)}</span>
        <span><span className="block text-ink-3">Doer payouts</span>{formatInr(otherPayouts + payout)}</span>
        <span><span className="block text-ink-3">Margin</span><b>{formatInr(margin)}</b></span>
      </div>
      {pct < 45 ? <p className="mt-2 text-warning-ink">Below the 45% target. Check the payout.</p> : null}
    </div>
  );
}
