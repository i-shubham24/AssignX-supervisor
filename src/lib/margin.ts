/**
 * One definition of payout and margin, used by the demo backend and every screen,
 * so the number QQD sees on the payouts page is the number the project page shows.
 */
import type { Project, ProjectDoer } from "@/types/domain";
import type { Minor } from "./money";
import { percentOf } from "./money";
import { RESERVE_PERCENT_OF_MARGIN } from "./config";

export const isWorkingDoer = (pd: ProjectDoer) => pd.status === "accepted" || pd.status === "completed";

/** What a doer is actually paid after the supervisor's fault decision (PRD 11.3). */
export function effectivePayout(pd: ProjectDoer): Minor {
  if (pd.liability_decision === "at_fault") return 0;
  if (pd.liability_decision === "partial") return Math.min(pd.payout_amount_inr, pd.partial_payout_inr ?? pd.payout_amount_inr);
  return pd.payout_amount_inr;
}

/**
 * Margin = INR received (after credits) minus what doers are paid. Open offers are
 * excluded unless asked for, because an offer is not a cost until it is accepted.
 */
export function projectMargin(p: Pick<Project, "quote_amount_inr" | "credits_applied_inr" | "doers">, opts: { includeOffers?: boolean } = {}): Minor | null {
  if (p.quote_amount_inr === null) return null;
  const lines = p.doers.filter((d) => isWorkingDoer(d) || (opts.includeOffers && d.status === "offered"));
  const cost = lines.reduce((sum, d) => sum + effectivePayout(d), 0);
  return p.quote_amount_inr - p.credits_applied_inr - cost;
}

export function reserveFor(margin: Minor | null): Minor {
  return margin && margin > 0 ? percentOf(margin, RESERVE_PERCENT_OF_MARGIN) : 0;
}
