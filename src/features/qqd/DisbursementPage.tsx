import { HandCoins, RotateCw, ShieldCheck } from "lucide-react";
import { useAction, useDisbursements } from "@/api/hooks";
import * as api from "@/api/portal";
import { useMe } from "@/providers/SessionProvider";
import { EmptyState, ErrorState, Money, PageHeader, Panel, SlaClock } from "@/components/portal/kit";
import { CategoryBadge, Code, Pill } from "@/components/portal/pills";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/overlay";
import { KpiStrip } from "@/features/overview/widgets";
import { CATEGORIES, RESERVE_PERCENT_OF_MARGIN, SLA, TDS_THRESHOLD_INR } from "@/lib/config";
import { formatInr, sumMinor } from "@/lib/money";
import { formatDateTime, formatRelative } from "@/lib/datetime";
import type { DisbursementItem, DisbursementLine } from "@/types/domain";

/**
 * Approved projects awaiting doer payout (PRD 11.1 Disbursement). QQD only. Every
 * execution is logged immutably; records are never edited, only reversed.
 */
export default function DisbursementPage() {
  const { data, isLoading, error, refetch } = useDisbursements();
  const items = data ?? [];
  const lines = items.flatMap((i) => i.lines);
  const queued = lines.filter((l) => l.status === "queued");
  const failed = lines.filter((l) => l.status === "failed");

  return (
    <>
      <PageHeader title="Payouts" sub="Approved projects ready to pay." />
      <KpiStrip
        loading={isLoading}
        items={[
          { label: "Lines to pay", value: queued.length, foot: `${formatInr(sumMinor(queued.map((l) => l.net_inr)))} net` },
          { label: "Failed transfers", value: failed.length, chip: failed.length ? { text: "Retry", tone: "danger" } : undefined },
          { label: "TDS to deduct", value: formatInr(sumMinor(queued.map((l) => l.tds_inr))), foot: "Section 194J" },
          { label: "Reserve to hold", value: formatInr(sumMinor(items.map((i) => i.reserve_inr))), foot: `${RESERVE_PERCENT_OF_MARGIN}% of margin for 90 days` },
        ]}
      />
      <div className="mt-5 space-y-4">
        {error ? (
          <Panel><ErrorState error={error} onRetry={() => void refetch()} /></Panel>
        ) : isLoading ? (
          [0, 1].map((i) => <div key={i} className="skeleton h-48 rounded-2xl" />)
        ) : items.length === 0 ? (
          <Panel><EmptyState icon={<HandCoins />} title="Nothing to pay" body="Approved projects show up here." /></Panel>
        ) : (
          items.map((item) => <DisbursementCard key={item.project.id} item={item} />)
        )}
      </div>
    </>
  );
}

function DisbursementCard({ item }: { item: DisbursementItem }) {
  const p = item.project;
  return (
    <section className="overflow-hidden rounded-2xl border border-line-card bg-surface shadow-soft-sm">
      <header className="flex flex-wrap items-center gap-2 border-b border-line-subtle px-5 py-3">
        <Code>{p.code}</Code>
        <CategoryBadge category={p.category} short />
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{p.title}</span>
        <Pill tone={item.trigger === "client_approved" ? "success" : "warning"}>{item.trigger === "client_approved" ? "Client approved" : "Auto-released"} {formatRelative(item.triggered_at)}</Pill>
        <SlaClock since={item.triggered_at} target={SLA.disbursement.target} escalate={SLA.disbursement.escalate} />
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0 overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line-subtle bg-surface-2 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3">
                <th className="px-5 py-2">Doer</th>
                <th className="px-3 py-2 text-right">Gross</th>
                <th className="px-3 py-2 text-right">TDS</th>
                <th className="px-3 py-2 text-right">Net payable</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-5 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {item.lines.map((l) => <LineRow key={l.project_doer_id} l={l} />)}
            </tbody>
          </table>
        </div>
        <dl className="space-y-2 border-t border-line-subtle bg-surface-2 p-4 text-[12.5px] lg:border-l lg:border-t-0">
          <Row k="Client paid" v={<Money amount={p.quote_amount} currency={p.quote_currency} />} />
          <Row k="INR at capture" v={<Money amount={p.quote_amount_inr} />} />
          {p.credits_applied_inr ? <Row k="Credits applied" v={<Money amount={-p.credits_applied_inr} />} /> : null}
          <Row k="Doer payouts" v={<Money amount={sumMinor(item.lines.map((l) => l.gross_inr))} />} />
          <div className="border-t border-line-card pt-2" />
          <Row k="Margin" v={<b className={item.margin_inr < 0 ? "text-danger-ink" : "text-success-ink"}>{formatInr(item.margin_inr)}</b>} />
          <Row k={`Reserve (${RESERVE_PERCENT_OF_MARGIN}%)`} v={<Money amount={item.reserve_inr} />} />
        </dl>
      </div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-ink-3">{k}</dt>
      <dd className="tabular">{v}</dd>
    </div>
  );
}

function LineRow({ l }: { l: DisbursementLine }) {
  const me = useMe();
  const exec = useAction(() => api.executePayout(l.project_doer_id, me.id), { success: `Paid ${l.doer_code} ${formatInr(l.net_inr)}.` });
  const crossed = l.fy_paid_before_inr <= TDS_THRESHOLD_INR && l.fy_paid_before_inr + l.gross_inr > TDS_THRESHOLD_INR;
  return (
    <tr>
      <td className="px-5 py-3">
        <div className="font-mono text-[13px] font-bold">{l.doer_code}</div>
        <div className="text-[11.5px] text-ink-3">{CATEGORIES[l.discipline].short}{l.liability_decision ? `, liability: ${l.liability_decision.replace(/_/g, " ")}` : ""}</div>
      </td>
      <td className="px-3 py-3 text-right tabular">{formatInr(l.gross_inr)}</td>
      <td className="px-3 py-3 text-right tabular">
        <Tip content={`Paid this financial year: ${formatInr(l.fy_paid_before_inr)}${crossed ? ". This payment crosses the TDS limit, so TDS is on the full amount." : ""}`}>
          <span className={crossed ? "border-b border-dashed border-warning-dot text-warning-ink" : ""}>{formatInr(l.tds_inr)}</span>
        </Tip>
      </td>
      <td className="px-3 py-3 text-right font-bold tabular">{formatInr(l.net_inr)}</td>
      <td className="px-3 py-3">
        {l.status === "paid" ? (
          <Tip content={`${l.executed_by} at ${l.executed_at ? formatDateTime(l.executed_at) : ""}, ref ${l.provider_ref}`}><span><Pill tone="success">Paid</Pill></span></Tip>
        ) : l.status === "failed" ? (
          <div><Pill tone="danger">Failed</Pill><div className="mt-0.5 max-w-[200px] text-[11px] text-danger-ink">{l.failure_reason}</div></div>
        ) : l.status === "withheld" ? (
          <Pill tone="neutral">Withheld</Pill>
        ) : (
          <Pill tone="info">Queued</Pill>
        )}
      </td>
      <td className="px-5 py-3 text-right">
        {l.status === "queued" || l.status === "failed" ? (
          <Button size="sm" variant={l.status === "failed" ? "outline" : "primary"} loading={exec.isPending} onClick={() => exec.mutate(undefined)}>
            {l.status === "failed" ? <><RotateCw /> Retry</> : <><ShieldCheck /> Pay</>}
          </Button>
        ) : null}
      </td>
    </tr>
  );
}
