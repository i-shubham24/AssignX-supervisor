import { ReceiptText } from "lucide-react";
import { Link } from "react-router-dom";
import { useAction, useRefunds } from "@/api/hooks";
import * as api from "@/api/portal";
import { useMe } from "@/providers/SessionProvider";
import { EmptyState, ErrorState, KeyValue, Money, PageHeader, Panel } from "@/components/portal/kit";
import { CategoryBadge, Code, Pill } from "@/components/portal/pills";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatRelative } from "@/lib/datetime";
import type { RefundRequest } from "@/types/domain";

const LIABILITY: Record<string, string> = {
  not_at_fault: "Not at fault: doer paid in full",
  partial: "Partly at fault: partial payout",
  at_fault: "At fault: payout withheld",
  company_process: "Our error: doer still paid",
};

/**
 * Refunds approved by Support, awaiting execution (PRD 6.6, 11.1). Only QQD moves
 * money; the role that investigated never executes.
 */
export default function RefundsPage() {
  const { data, isLoading, error, refetch } = useRefunds();
  const waiting = (data ?? []).filter((r) => r.status === "awaiting_execution");
  const done = (data ?? []).filter((r) => r.status !== "awaiting_execution");
  return (
    <>
      <PageHeader title="Refunds" sub="Refunds Support has approved." />
      {error ? (
        <Panel><ErrorState error={error} onRetry={() => void refetch()} /></Panel>
      ) : isLoading ? (
        <div className="skeleton h-48 rounded-2xl" />
      ) : waiting.length === 0 ? (
        <Panel><EmptyState icon={<ReceiptText />} title="No refunds waiting" body="Approved refunds show up here." /></Panel>
      ) : (
        <div className="space-y-4">{waiting.map((r) => <RefundCard key={r.id} r={r} />)}</div>
      )}
      {done.length ? (
        <Panel className="mt-6" title="Done" padded={false}>
          <ul className="divide-y divide-line-subtle">
            {done.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-[13px]">
                <Code>{r.project.code}</Code>
                <span className="min-w-0 flex-1 truncate font-semibold">{r.project.title}</span>
                <Money amount={r.amount} currency={r.currency} />
                <span className="text-xs text-ink-3">{r.executed_by}, {r.executed_at ? formatRelative(r.executed_at) : ""}</span>
                <Pill tone="success">Refunded</Pill>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </>
  );
}

function RefundCard({ r }: { r: RefundRequest }) {
  const me = useMe();
  const exec = useAction(() => api.executeRefund(r.id, me.id), { success: "Refund started. The project is now cancelled." });
  return (
    <section className="rounded-2xl border border-line-card bg-surface p-5 shadow-soft-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Code>{r.project.code}</Code>
        <CategoryBadge category={r.project.category} short />
        <span className="text-[15px] font-bold">{r.project.title}</span>
        <Pill tone={r.kind === "full" ? "danger" : "warning"} dot={false} className="ml-auto">{r.kind === "full" ? "Full refund" : "Partial refund"}</Pill>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_240px]">
        <div>
          <p className="rounded-xl bg-surface-2 p-3 text-[13px] leading-relaxed text-ink-2">{r.recommendation}</p>
          <KeyValue
            className="mt-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
            cols={3}
            items={[
              { k: "Ticket", v: <Link to="/tickets" className="font-mono text-[13px] hover:underline">{r.ticket_reference}</Link> },
              { k: "Recommended by", v: r.recommended_by },
              { k: "Approved", v: formatDateTime(r.approved_at) },
              { k: "Doer fault", v: r.liability_decision ? `${LIABILITY[r.liability_decision]}${r.liability_decided_by ? ` (${r.liability_decided_by})` : ""}` : "Waiting for the supervisor" },
              { k: "Client paid", v: <Money amount={r.project.quote_amount} currency={r.project.quote_currency} /> },
            ]}
          />
        </div>
        <div className="flex flex-col justify-between rounded-xl border border-line-card bg-surface-2 p-4">
          <div>
            <div className="text-xs text-ink-3">Refund amount</div>
            <div className="mt-1 text-[26px] font-bold tabular"><Money amount={r.amount} currency={r.currency} /></div>
            <p className="mt-1 text-[11.5px] text-ink-3">In the client's currency.</p>
          </div>
          {!r.liability_decision ? <p className="mt-3 text-xs font-semibold text-warning-ink">The supervisor must decide doer fault first.</p> : null}
          <Button variant="primary" className="mt-4" disabled={!r.liability_decision} loading={exec.isPending} onClick={() => exec.mutate(undefined)}>
            Issue refund
          </Button>
        </div>
      </div>
    </section>
  );
}
