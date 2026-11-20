/**
 * Money is integer minor units with an explicit ISO 4217 code, end to end (BR-029).
 * Never floats. Client quotes are in the client's currency; doer payouts, TDS,
 * margin and the ledger are always INR paise.
 *
 * Postgres bigint arrives over PostgREST as a string, so every amount goes through
 * toMinor before arithmetic, or "500" + "300" silently becomes "500300".
 */

export const CURRENCIES = ["INR", "USD", "GBP", "AUD", "EUR", "AED", "CAD"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Integer minor units: paise for INR, cents for USD, pence for GBP, and so on. */
export type Minor = number;

export interface Money {
  amount: Minor;
  currency: Currency;
}

export function toMinor(value: unknown): Minor {
  if (typeof value === "number") return Number.isFinite(value) ? Math.trunc(value) : 0;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

const LOCALE: Record<Currency, string> = {
  INR: "en-IN",
  USD: "en-US",
  GBP: "en-GB",
  AUD: "en-AU",
  EUR: "en-IE",
  AED: "en-AE",
  CAD: "en-CA",
};

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: Currency, precise: boolean): Intl.NumberFormat {
  const key = `${currency}:${precise ? 2 : 0}`;
  let fmt = formatters.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(LOCALE[currency], {
      style: "currency",
      currency,
      minimumFractionDigits: precise ? 2 : 0,
      maximumFractionDigits: precise ? 2 : 0,
    });
    formatters.set(key, fmt);
  }
  return fmt;
}

/** Format minor units. Whole amounts drop decimals to keep figures scannable. */
export function formatMoney(amount: unknown, currency: Currency = "INR", opts?: { precise?: boolean }): string {
  const value = toMinor(amount);
  const precise = opts?.precise || value % 100 !== 0;
  return formatter(currency, precise).format(value / 100);
}

export function formatInr(paise: unknown, opts?: { precise?: boolean }): string {
  return formatMoney(paise, "INR", opts);
}

/** Parse a typed major-unit amount ("12,500.50") into minor units, or null. */
export function parseMajorToMinor(input: string): Minor | null {
  const cleaned = input.replace(/[,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole = "0", fraction = ""] = cleaned.split(".");
  return Number.parseInt(whole, 10) * 100 + Number.parseInt(fraction.padEnd(2, "0") || "0", 10);
}

export function minorToMajorString(amount: Minor): string {
  const whole = Math.trunc(amount / 100);
  const fraction = Math.abs(amount % 100);
  return fraction === 0 ? String(whole) : `${whole}.${String(fraction).padStart(2, "0")}`;
}

export function sumMinor(values: readonly unknown[]): Minor {
  return values.reduce<number>((total, value) => total + toMinor(value), 0);
}

/** Percentage of a whole, rounded down to a whole paisa. */
export function percentOf(amount: Minor, percent: number): Minor {
  return Math.floor((amount * percent) / 100);
}
