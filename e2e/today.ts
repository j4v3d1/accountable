// The end-to-end run fixes today's date, the clock and the time zone, so the sample
// data and everything on screen look the same on every run and every computer
// (concern 15). The seed's activity times are local, so the time zone is fixed too.
export const TODAY = "2026-11-18";
export const TIME_ZONE = "America/New_York";

/** Noon on TODAY in TIME_ZONE (New York is five hours behind UTC in November). */
export const NOON_TODAY = new Date(`${TODAY}T17:00:00Z`);

/** The date a number of days from TODAY, as YYYY-MM-DD. */
export function inDays(days: number): string {
  const date = new Date(`${TODAY}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
