import { Lock } from "lucide-react";
import { useLedger } from "@/api/hooks";
import { PageHeader, Panel } from "@/components/portal/kit";
import { QueueTable } from "@/components/portal/QueueTable";
import { Code, Pill } from "@/components/portal/pills";
import { KpiStrip } from "@/features/overview/widgets";
import { formatDateTime } from "@/lib/datetime";
import { formatInr, formatMoney, sumMinor } from "@/lib/money";
import type { LedgerEntry } from "@/types/domain";

const TYPE: Record<LedgerEntry["type"], { label: string; tone: React.ComponentProps<typeof Pill>["tone"]; sign: 1 | -1 }> = {
  payment_captured: { label: "Payment captured", tone: "success", sign: 1 },
  refund_executed: { label: "Refund", tone: "danger", sign: -1 },
  payout_executed: { label: "Doer payout", tone: "info", sign: -1 },
  reserve_held: { label: "Reserve held", tone: "warning", sign: -1 },
  reserve_released: { label: "Reserve released", tone: "success", sign: 1 },
  credits_applied: { label: "Credits applied", tone: "neutral", sign: -1 },
};

/** Money in, money out, margin. Append-only: entries are never edited (BR-031). */
export default function LedgerPage() {
  const { data, isLoading } = useLedger();
  const rows = data ?? [];
  const sum = (t: LedgerEntry["type"]) => sumMinor(rows.filter((r) => r.type === t).map((r) => r.inr_equivalent));
  return (
    <>
      <PageHeader title="Transactions" sub="Every payment in and out." actions={<Pill tone="neutral"><Lock className="h-3 w-3" /> Read only</Pill>} />
      <KpiStrip
        loading={isLoading}
        items={[
          { label: "Captured", value: formatInr(sum("payment_captured")), foot: "INR at payment rate" },
          { label: "Doer payouts", value: formatInr(sum("payout_executed")), foot: "Net of TDS" },
          { label: "Refunds", value: formatInr(sum("refund_executed")) },
          { label: "Reserve held", value: formatInr(sum("reserve_held")), foot: "Released after 90 days" },
        ]}
      />
      <Panel className="mt-5" padded={false}>
        <QueueTable
          caption="Transactions"
          rows={isLoading ? undefined : rows}
          loading={isLoading}
          rowKey={(r) => r.id}
          empty={{ title: "No entries yet" }}
          columns={[
            { key: "t", header: "When", width: "160px", sort: (r) => r.created_at, cell: (r) => <span className="text-[12.5px] text-ink-muted">{formatDateTime(r.created_at)}</span> },
            { key: "y", header: "Type", width: "160px", cell: (r) => <Pill tone={TYPE[r.type].tone}>{TYPE[r.type].label}</Pill> },
            { key: "p", header: "Project", width: "120px", cell: (r) => <Code>{r.project_code}</Code> },
            { key: "a", header: "Amount", align: "right", cell: (r) => <span className="tabular font-semibold">{formatMoney(r.amount * TYPE[r.type].sign, r.currency)}</span> },
            { key: "i", header: "INR", align: "right", cell: (r) => <span className="tabular">{formatInr(r.inr_equivalent * TYPE[r.type].sign)}</span> },
            { key: "f", header: "FX", width: "80px", cell: (r) => <span className="font-mono text-xs text-ink-3">{r.fx_rate && r.fx_rate !== 1 ? r.fx_rate.toFixed(2) : ""}</span> },
            { key: "o", header: "By", width: "150px", cell: (r) => <span className="text-[12.5px]">{r.actor}</span> },
            { key: "r", header: "Reference", width: "150px", cell: (r) => <span className="font-mono text-[11.5px] text-ink-3">{r.provider_ref ?? ""}</span> },
          ]}
        />
      </Panel>
    </>
  );
}
