/** The change from last month (R32). Blank change means last month had no revenue. */
export function revenueChange(
  changePercent: number | null,
  lastMonth: string,
): { direction: "up" | "down" | "flat" | "none"; text: string } {
  if (changePercent === null) return { direction: "none", text: `No revenue won in ${lastMonth}` };
  const rounded = Math.round(Math.abs(changePercent));
  if (rounded === 0) return { direction: "flat", text: `Same as ${lastMonth}` };
  return { direction: changePercent > 0 ? "up" : "down", text: `${rounded}% from ${lastMonth}` };
}

/** The win rate over six months, or a note when nothing has closed (R33). */
export function winRateNote(winRate: number | null): string {
  return winRate === null ? "No closed deals yet" : `${Math.round(winRate)}% win rate`;
}

export function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}
