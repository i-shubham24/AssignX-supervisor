import { useMemo, useState } from "react";
import { useRateBands } from "@/api/hooks";
import { PageHeader, Panel, Segmented } from "@/components/portal/kit";
import { CategoryBadge } from "@/components/portal/pills";
import { CATEGORY_SLUGS } from "@/lib/config";
import { CURRENCIES, formatMoney, type Currency } from "@/lib/money";

/**
 * Internal pricing guidance by category and scope (PRD 11.1). Read-only here: the
 * table is configuration maintained in AdminX. Advisory, never auto-fills a quote.
 */
export default function RatesPage() {
  const { data, isLoading } = useRateBands();
  const [currency, setCurrency] = useState<Currency>("INR");
  const bands = useMemo(() => (data ?? []).filter((b) => b.currency === currency), [data, currency]);
  return (
    <>
      <PageHeader title="Price guide" sub="Typical prices. Edit them in AdminX." />
      <Segmented className="mb-4" aria-label="Currency" value={currency} onChange={setCurrency} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
      <Panel padded={false}>
        {isLoading ? (
          <div className="skeleton m-4 h-64" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line-subtle bg-surface-2 text-[11px] font-bold uppercase tracking-[0.06em] text-ink-3">
                  <th className="px-5 py-2.5">Category</th>
                  <th className="px-3 py-2.5">Scope</th>
                  <th className="px-3 py-2.5 text-right">Low</th>
                  <th className="px-3 py-2.5 text-right">Typical</th>
                  <th className="px-5 py-2.5 text-right">High</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-subtle">
                {CATEGORY_SLUGS.flatMap((cat) =>
                  bands
                    .filter((b) => b.category === cat)
                    .map((b, i) => (
                      <tr key={b.id} className="hover:bg-hover">
                        <td className="px-5 py-2.5">{i === 0 ? <CategoryBadge category={cat} /> : null}</td>
                        <td className="px-3 py-2.5 font-medium">{b.scope_band}</td>
                        <td className="px-3 py-2.5 text-right tabular text-ink-muted">{formatMoney(b.low, currency)}</td>
                        <td className="px-3 py-2.5 text-right font-bold tabular">{formatMoney(b.typical, currency)}</td>
                        <td className="px-5 py-2.5 text-right tabular text-ink-muted">{formatMoney(b.high, currency)}</td>
                      </tr>
                    )),
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
