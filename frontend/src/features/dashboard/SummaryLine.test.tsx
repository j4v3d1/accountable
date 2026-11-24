import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SummaryLine } from "./SummaryLine";
import { revenueChange, winRateNote } from "./wording";

function line(summary: { open_deals: number; open_value: number; overdue_follow_ups: number; late_deals: number }) {
  const { container } = render(<SummaryLine summary={summary} />);
  return container.textContent;
}

describe("SummaryLine", () => {
  it("gives the open deals, the overdue follow-ups and the late deals", () => {
    expect(line({ open_deals: 18, open_value: 10151500, overdue_follow_ups: 2, late_deals: 3 })).toBe(
      "18 open deals worth $10,151,500. 2 follow-ups are overdue and 3 deals are past their close date.",
    );
  });

  it("leaves out the parts that would be zero", () => {
    expect(line({ open_deals: 18, open_value: 10151500, overdue_follow_ups: 0, late_deals: 3 })).toBe(
      "18 open deals worth $10,151,500. 3 deals are past their close date.",
    );
    expect(line({ open_deals: 18, open_value: 10151500, overdue_follow_ups: 2, late_deals: 0 })).toBe(
      "18 open deals worth $10,151,500. 2 follow-ups are overdue.",
    );
    expect(line({ open_deals: 0, open_value: 0, overdue_follow_ups: 2, late_deals: 0 })).toBe(
      "2 follow-ups are overdue.",
    );
  });

  it("uses the singular for one", () => {
    expect(line({ open_deals: 1, open_value: 415000, overdue_follow_ups: 1, late_deals: 1 })).toBe(
      "1 open deal worth $415,000. 1 follow-up is overdue and 1 deal is past its close date.",
    );
  });

  it("says when there's nothing open at all", () => {
    expect(line({ open_deals: 0, open_value: 0, overdue_follow_ups: 0, late_deals: 0 })).toBe(
      "No open deals yet. Add a deal to start the pipeline.",
    );
  });
});

describe("dashboard wording", () => {
  it("gives the change from last month, or says last month had no revenue", () => {
    expect(revenueChange(-30.06, "October")).toEqual({ direction: "down", text: "30% from October" });
    expect(revenueChange(25, "October")).toEqual({ direction: "up", text: "25% from October" });
    expect(revenueChange(0, "October")).toEqual({ direction: "flat", text: "Same as October" });
    expect(revenueChange(null, "October")).toEqual({ direction: "none", text: "No revenue won in October" });
  });

  it("gives the win rate, or says nothing has closed", () => {
    expect(winRateNote(66.67)).toBe("67% win rate");
    expect(winRateNote(null)).toBe("No closed deals yet");
  });
});
