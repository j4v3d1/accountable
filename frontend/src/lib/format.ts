import { format, isSameDay, parseISO } from "date-fns";

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const shortDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumSignificantDigits: 3,
});

/** Whole US dollars, such as $485,000 (concern 10). */
export function money(amount: number): string {
  return dollars.format(amount);
}

/** Shortened amounts for tiles and chart axes, such as $612K and $1.2M. */
export function moneyShort(amount: number): string {
  return shortDollars.format(amount);
}

/** Whole percentages, such as 60%. */
export function percent(value: number): string {
  return `${Math.round(value)}%`;
}

/** A plain date ("2026-11-23") as Nov 23, 2026. Parsed as a local date, so the day never shifts. */
export function formatDate(isoDate: string): string {
  return format(parseISO(isoDate), "MMM d, yyyy");
}

/** A plain date as Jan 14, for cards and follow-ups. */
export function formatShortDate(isoDate: string): string {
  return format(parseISO(isoDate), "MMM d");
}

/** A UTC timestamp in local time, such as Nov 22, 2026, 10:42 AM. */
export function formatDateTime(isoTimestamp: string): string {
  return format(parseISO(isoTimestamp), "MMM d, yyyy, h:mm a");
}

/** "Today, 10:42 AM" for today's timestamps, otherwise the date. */
export function formatWhen(isoTimestamp: string, now: Date = new Date()): string {
  const when = parseISO(isoTimestamp);
  return isSameDay(when, now) ? `Today, ${format(when, "h:mm a")}` : format(when, "MMM d, yyyy");
}

/** Today's date as YYYY-MM-DD, in local time. */
export function todayIso(now: Date = new Date()): string {
  return format(now, "yyyy-MM-dd");
}
