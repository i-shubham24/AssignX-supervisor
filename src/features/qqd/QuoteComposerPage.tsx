import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, CalendarClock, Info, Paperclip, Send } from "lucide-react";
import { useAction, useProject, useRateBands } from "@/api/hooks";
import * as api from "@/api/portal";
import { useMe } from "@/providers/SessionProvider";
import { CATEGORIES, QUOTE_NOTE_MAX, SLA, URGENCY } from "@/lib/config";
import { formatDateTime, formatRelative, HOUR, hoursToLabel } from "@/lib/datetime";
import { formatInr, formatMoney, parseMajorToMinor } from "@/lib/money";
import { DEMO_FX_TO_INR } from "@/demo/seed";
import { cn } from "@/lib/cn";
import { env } from "@/lib/env";
import { DemoNote, ErrorState, KeyValue, PageHeader, Panel, SlaClock } from "@/components/portal/kit";
import { CategoryBadge, Code, Pill, SideTag, StatusPill, UrgencyPill } from "@/components/portal/pills";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { ChatThread } from "@/features/projects/ChatThread";
import type { Project } from "@/types/domain";

export default function QuoteComposerPage() {
  const { id = "" } = useParams();
  const { data: p, isLoading, error, refetch } = useProject(id);
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading || !p) return <div className="skeleton h-[640px] rounded-2xl" aria-busy="true" />;
  // Keyed by project so a half-typed quote never follows you to another task.
  return <Composer key={p.id} p={p} />;
}

const DURATIONS = [12, 24, 48, 72, 96, 120, 168, 240, 336];

function Composer({ p }: { p: Project }) {
  const me = useMe();
  const bands = useRateBands();
  const [amount, setAmount] = useState("");
  const [cost, setCost] = useState("");
  const [duration, setDuration] = useState<string>("72");
  const [note, setNote] = useState(p.quote_note ?? "");
  const [changing, setChanging] = useState(false);
  const currency = p.client.currency;

  const send = useAction(
    () => {
      const minor = parseMajorToMinor(amount);
      const costMinor = parseMajorToMinor(cost);
      if (minor === null || minor <= 0) throw new Error(`PORTAL: Enter the quote in ${currency}, for example 420.`);
      if (costMinor === null || costMinor <= 0) throw new Error("PORTAL: Enter the doer cost in INR.");
      return api.sendQuote(p.id, { amount: minor, currency, delivery_duration_hours: Number(duration), note, expected_doer_cost_inr: costMinor }, me.id);
    },
    { success: () => (p.status === "awaiting_payment" ? "Quote updated. The client is told." : "Quote sent to the client."), onSuccess: () => setChanging(false) },
  );
  const reopen = useAction(() => api.reopenQuote(p.id, me.id), { success: "Back in the quote queue." });
  const pay = useAction(() => api.demo.clientPays(p.id), { success: "Demo: client paid. Project moved to assignment." });

  const minor = parseMajorToMinor(amount);
  const costMinor = parseMajorToMinor(cost);
  const quoteInr = minor !== null ? Math.round(minor * DEMO_FX_TO_INR[currency]) : null;
  const margin = quoteInr !== null && costMinor !== null ? quoteInr - costMinor : null;
  const marginPct = margin !== null && quoteInr ? Math.round((margin / quoteInr) * 100) : null;
  const expiry = p.deadline_utc ? new Date(new Date(p.deadline_utc).getTime() - Number(duration) * HOUR) : null;
  const expiryPast = expiry ? expiry.getTime() <= Date.now() : false;

  const relevant = useMemo(() => (bands.data ?? []).filter((b) => b.category === p.category && b.currency === currency), [bands.data, p.category, currency]);
  const relevantInr = useMemo(() => (bands.data ?? []).filter((b) => b.category === p.category && b.currency === "INR"), [bands.data, p.category]);

  const expired = p.status === "awaiting_payment" && p.quote_expires_at !== null && new Date(p.quote_expires_at).getTime() <= Date.now();
  const cancelledExpired = p.status === "cancelled" && p.cancellation_reason === "quote_expired";
  const quoted = p.status !== "awaiting_quote" && !changing;

  return (
    <>
      <PageHeader
        back={{ to: "/quotes", label: "Quotes" }}
        eyebrow={
          <>
            <Code>{p.code}</Code>
            <CategoryBadge category={p.category} />
            <UrgencyPill urgency={p.urgency} />
            <StatusPill status={p.status} />
            {!quoted ? <SlaClock since={p.created_at} target={SLA.quote.target} escalate={SLA.quote.escalate} /> : null}
          </>
        }
        title={p.title}
        sub={<>Client: <b className="text-ink-2">{p.client.display_name}</b> · {p.client.segment} · {p.client.country} · {p.client.projects_count} previous project{p.client.projects_count === 1 ? "" : "s"} · quotes in <b>{currency}</b></>}
      />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0 space-y-4">
          <Panel title="Task details">
            <p className="prose-plain text-[14px] leading-relaxed text-ink-2">{p.description}</p>
            {p.category_answers.length ? (
              <dl className="mt-4 divide-y divide-line-subtle rounded-xl border border-line-card">
                {p.category_answers.map((a) => (
                  <div key={a.question} className="grid grid-cols-1 gap-0.5 px-3 py-2 text-[13px] sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] sm:gap-3">
                    <dt className="text-ink-3">{a.question}</dt>
                    <dd className="font-medium">{a.answer}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <KeyValue
              className="mt-4 grid-cols-2 sm:grid-cols-3"
              cols={3}
              items={[
                { k: "Deadline", v: p.deadline_utc ? formatDateTime(p.deadline_utc) : "None given" },
                { k: "Urgency", v: URGENCY[p.urgency].label },
                { k: "Submitted", v: formatRelative(p.created_at) },
              ]}
            />
            {p.attachments.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {p.attachments.map((a) => (
                  <span key={a.id} className="inline-flex items-center gap-1.5 rounded-lg border border-line-card bg-surface-2 px-2.5 py-1.5 text-xs font-medium">
                    <Paperclip className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
                    {a.filename}
                  </span>
                ))}
              </div>
            ) : null}
            {p.category === "other" ? <p className="mt-4 rounded-xl bg-info-bg p-3 text-xs text-info-ink">Set a real category before quoting. Decline academic, coursework or exam work.</p> : null}
          </Panel>
          <section className="flex h-[70vh] flex-col xl:h-[460px] overflow-hidden rounded-2xl border border-line-card bg-surface shadow-soft-sm">
            <div className="flex items-center justify-between border-b border-line-subtle px-4 py-2.5">
              <span className="text-[13px] font-bold">Chat with client</span>
              <SideTag side="client" />
            </div>
            <ChatThread project={p} channel="client" className="flex-1" />
          </section>
        </div>

        <div className="space-y-4 xl:sticky xl:top-3">
          <Panel title="Price guide" sub="Guide only. The client never sees it.">
            {bands.isLoading ? (
              <div className="skeleton h-24" />
            ) : relevant.length === 0 ? (
              <p className="text-sm text-ink-3">No price guide for {CATEGORIES[p.category].label} in {currency}.</p>
            ) : (
              <ul className="space-y-2.5">
                {relevant.map((b, i) => (
                  <li key={b.id}>
                    <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                      <span className="font-semibold">{b.scope_band}</span>
                      <span className="text-ink-3">{formatInr(relevantInr[i]?.typical ?? 0)} typical in INR</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-[12px] tabular">
                      <span className="text-ink-3">{formatMoney(b.low, currency)}</span>
                      <span className="relative h-1.5 flex-1 rounded-full bg-subtle">
                        <span className="absolute inset-y-0 rounded-full bg-primary/30" style={{ left: "0%", right: "0%" }} />
                        <span className="absolute -top-1 h-3.5 w-1 rounded-full bg-primary" style={{ left: `${((b.typical - b.low) / Math.max(1, b.high - b.low)) * 100}%` }} />
                      </span>
                      <span className="text-ink-3">{formatMoney(b.high, currency)}</span>
                    </div>
                    <div className="mt-0.5 text-center text-[11.5px] font-bold">{formatMoney(b.typical, currency)} typical</div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {quoted ? (
            <Panel title={expired ? "Quote expired" : cancelledExpired ? "Cancelled: quote expired" : "Quote sent"} tone={expired || cancelledExpired ? "warning" : "client"}>
              <KeyValue
                items={[
                  { k: "Client quote", v: p.quote_amount !== null ? formatMoney(p.quote_amount, p.quote_currency) : "" },
                  { k: "Delivery", v: p.delivery_duration_hours ? hoursToLabel(p.delivery_duration_hours) : "" },
                  { k: "Expires", v: p.quote_expires_at ? formatDateTime(p.quote_expires_at) : "No expiry" },
                  { k: "Expected margin", v: p.margin_inr !== null ? formatInr(p.margin_inr) : "" },
                ]}
              />
              {expired ? <p className="mt-3 text-xs text-warning-ink">The client can't pay an expired quote. It cancels itself 24 hours after expiry.</p> : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {p.status === "awaiting_payment" && !expired ? (
                  <Button variant="primary" onClick={() => setChanging(true)}>Change quote</Button>
                ) : null}
                {expired || cancelledExpired ? (
                  <Button variant="primary" loading={reopen.isPending} onClick={() => reopen.mutate(undefined)}>Reopen for a new quote</Button>
                ) : null}
                <Button asChild variant="outline">
                  <Link to={`/projects/${p.id}`}>Open project <ArrowRight /></Link>
                </Button>
              </div>
              {env.demoMode && p.status === "awaiting_payment" && !expired ? (
                <DemoNote className="mt-3">
                  Simulate:
                  <Button size="xs" variant="outline" loading={pay.isPending} onClick={() => pay.mutate(undefined)}>Client pays</Button>
                </DemoNote>
              ) : null}
            </Panel>
          ) : (
            <Panel title={changing ? "Change the quote" : "Set the quote"} actions={changing ? <Button size="xs" variant="ghost" onClick={() => setChanging(false)}>Cancel</Button> : null}>
              <div className="space-y-4">
                <Field label={`Client quote (${currency})`} required hint="One fixed price, paid upfront.">
                  {({ id, describedBy }) => (
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-semibold text-ink-3">{currency}</span>
                      <Input id={id} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" className="pl-12 text-[15px] font-semibold tabular" aria-describedby={describedBy} />
                    </div>
                  )}
                </Field>
                <Field label="Delivery duration" required hint="Working time needed. Sets the quote expiry.">
                  {({ id }) => <Select id={id} value={duration} onChange={setDuration} options={DURATIONS.map((h) => ({ value: String(h), label: hoursToLabel(h) }))} />}
                </Field>
                <Field label="Doer cost (INR)" required hint="Expected doer payout. Hidden from the client." aside={<SideTag side="internal" />}>
                  {({ id, describedBy }) => (
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-3">₹</span>
                      <Input id={id} inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" className="pl-7 tabular" aria-describedby={describedBy} />
                    </div>
                  )}
                </Field>
                <Field label="Coordinator note" hint={`Optional. ${note.length}/${QUOTE_NOTE_MAX}`} aside={<SideTag side="client" />}>
                  {({ id, describedBy }) => <Textarea id={id} value={note} maxLength={QUOTE_NOTE_MAX} onChange={(e) => setNote(e.target.value)} rows={3} aria-describedby={describedBy} placeholder="For example: editable source files included." />}
                </Field>

                <div className={cn("rounded-xl border p-3 text-[12.5px]", expiryPast ? "border-danger-dot/40 bg-danger-bg" : "border-line-card bg-surface-2")}>
                  <div className="flex items-center gap-2 font-semibold">
                    {expiryPast ? <AlertTriangle className="h-4 w-4 text-danger-ink" /> : <CalendarClock className="h-4 w-4 text-ink-3" />}
                    {expiry ? (expiryPast ? "Too long to meet the deadline" : `Quote expires ${formatDateTime(expiry)}`) : "No deadline, so the quote does not expire"}
                  </div>
                  {expiryPast ? <p className="mt-1 text-ink-muted">Shorten the duration or check the deadline with the client.</p> : null}
                </div>

                {margin !== null && quoteInr ? (
                  <div className="rounded-xl border border-line-card p-3 text-[12.5px]">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-bold uppercase tracking-[0.06em] text-ink-3">Expected margin</span>
                      <Pill tone={marginPct !== null && marginPct < 45 ? "warning" : "success"} dot={false}>{marginPct}% margin</Pill>
                    </div>
                    <div className="grid grid-cols-3 gap-2 tabular">
                      <span><span className="block text-ink-3">Quote in INR</span>{formatInr(quoteInr)}</span>
                      <span><span className="block text-ink-3">Doer cost</span>{formatInr(costMinor ?? 0)}</span>
                      <span><span className="block text-ink-3">Margin</span><b>{formatInr(margin)}</b></span>
                    </div>
                    <p className="mt-2 flex items-center gap-1 text-[11px] text-ink-3"><Info className="h-3 w-3" /> INR at an estimated rate.</p>
                  </div>
                ) : null}

                <Button variant="primary" size="lg" className="w-full" disabled={expiryPast || !amount || !cost} loading={send.isPending} onClick={() => send.mutate(undefined)}>
                  <Send /> Send quote
                </Button>
                <p className="text-center text-[11.5px] text-ink-3">The client sees you as Coordinator.</p>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
