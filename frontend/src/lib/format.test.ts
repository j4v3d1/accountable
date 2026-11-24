import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatShortDate, formatWhen, money, moneyShort, percent } from "./format";

describe("money", () => {
  it("writes whole US dollars with separators", () => {
    expect(money(485000)).toBe("$485,000");
    expect(money(0)).toBe("$0");
    expect(money(4081300)).toBe("$4,081,300");
  });

  it("rounds expected values to whole dollars", () => {
    expect(money(15000.15)).toBe("$15,000");
    expect(money(41500.5)).toBe("$41,501");
  });
});

describe("moneyShort", () => {
  it("shortens large amounts for tiles and chart axes", () => {
    expect(moneyShort(612000)).toBe("$612K");
    expect(moneyShort(1200000)).toBe("$1.2M");
    expect(moneyShort(10200000)).toBe("$10.2M");
    expect(moneyShort(5160000)).toBe("$5.16M");
    expect(moneyShort(1010000)).toBe("$1.01M");
    expect(moneyShort(214000)).toBe("$214K");
  });

  it("leaves small amounts as they are", () => {
    expect(moneyShort(0)).toBe("$0");
    expect(moneyShort(950)).toBe("$950");
  });
});

describe("dates", () => {
  it("writes a plain date as Nov 23, 2026 without shifting the day", () => {
    expect(formatDate("2026-11-23")).toBe("Nov 23, 2026");
    expect(formatDate("2027-01-01")).toBe("Jan 1, 2027");
  });

  it("has a short form for cards and follow-ups", () => {
    expect(formatShortDate("2026-01-14")).toBe("Jan 14");
  });

  it("writes timestamps in local time", () => {
    const local = new Date(2026, 10, 22, 10, 42);
    expect(formatDateTime(local.toISOString())).toBe("Nov 22, 2026, 10:42 AM");
  });

  it("says Today for timestamps from today", () => {
    const now = new Date(2026, 10, 23, 15, 0);
    expect(formatWhen(new Date(2026, 10, 23, 10, 42).toISOString(), now)).toBe("Today, 10:42 AM");
    expect(formatWhen(new Date(2026, 10, 22, 10, 42).toISOString(), now)).toBe("Nov 22, 2026");
  });
});

describe("percent", () => {
  it("writes whole percentages", () => {
    expect(percent(60)).toBe("60%");
    expect(percent(66.666)).toBe("67%");
    expect(percent(0)).toBe("0%");
  });
});
