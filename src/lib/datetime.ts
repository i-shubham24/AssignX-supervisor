/**
 * Every timestamp is stored in UTC and displayed in the viewer's own timezone
 * (BR-032). These helpers only ever format; they never shift stored values.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export { MINUTE, HOUR, DAY };

const dateTime = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});
const dateOnly = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });
const timeOnly = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });

export function toDate(value: string | number | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function formatDateTime(value: string | number | Date): string {
  return dateTime.format(toDate(value));
}

export function formatDate(value: string | number | Date): string {
  return dateOnly.format(toDate(value));
}

export function formatTime(value: string | number | Date): string {
  return timeOnly.format(toDate(value));
}

/** "3m", "2h 10m", "4d 3h". Always positive; the caller decides past or future. */
export function formatSpan(ms: number): string {
  const abs = Math.abs(ms);
  if (abs < MINUTE) return "<1m";
  if (abs < HOUR) return `${Math.floor(abs / MINUTE)}m`;
  if (abs < DAY) {
    const h = Math.floor(abs / HOUR);
    const m = Math.floor((abs % HOUR) / MINUTE);
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  const d = Math.floor(abs / DAY);
  const h = Math.floor((abs % DAY) / HOUR);
  return h ? `${d}d ${h}h` : `${d}d`;
}

/** Relative time under a week, absolute beyond (matches the client app rule). */
export function formatRelative(value: string | number | Date, now = Date.now()): string {
  const diff = toDate(value).getTime() - now;
  const abs = Math.abs(diff);
  if (abs < MINUTE) return "just now";
  if (abs < 7 * DAY) return diff < 0 ? `${formatSpan(diff)} ago` : `in ${formatSpan(diff)}`;
  return formatDate(value);
}

export function hoursToLabel(hours: number): string {
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  return rest ? `${days}d ${rest}h` : `${days} day${days === 1 ? "" : "s"}`;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
