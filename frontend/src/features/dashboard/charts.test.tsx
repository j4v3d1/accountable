import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RevenuePanel } from "./RevenuePanel";
import type { Dashboard } from "./types";
import { WonLostChart } from "./WonLostChart";

// jsdom does no layout, so every chart would measure 0 wide and draw nothing.
// Give the charts' containers a size, as a browser would.
beforeEach(() => {
  const measure = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.classList.contains("recharts-responsive-container")) {
      return { x: 0, y: 0, top: 0, left: 0, right: 600, bottom: 200, width: 600, height: 200, toJSON: () => ({}) };
    }
    return measure.call(this);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const months: Dashboard["revenue"]["months"] = [
  { month: "2026-06", label: "Jun", won_value: 214000, won_count: 1, lost_count: 0 },
  { month: "2026-07", label: "Jul", won_value: 0, won_count: 0, lost_count: 2 },
  { month: "2026-08", label: "Aug", won_value: 485000, won_count: 2, lost_count: 1 },
  { month: "2026-09", label: "Sep", won_value: 1310000, won_count: 3, lost_count: 0 },
  { month: "2026-10", label: "Oct", won_value: 480000, won_count: 1, lost_count: 0 },
  { month: "2026-11", label: "Nov", won_value: 612000, won_count: 4, lost_count: 3 },
];

const revenue: Dashboard["revenue"] = {
  this_month: 612000,
  last_month: 480000,
  last_month_label: "October",
  change_percent: 27.5,
  six_month_total: 3101000,
  best_month: { month: "2026-09", label: "Sep", value: 1310000 },
  months,
};

function chartTexts(container: HTMLElement) {
  return Array.from(container.querySelectorAll("svg text")).map((text) => text.textContent);
}

describe("RevenuePanel chart", () => {
  it("labels each month on the axis and each point with its revenue", () => {
    render(<RevenuePanel revenue={revenue} monthName="November" />);

    const texts = chartTexts(screen.getByRole("img"));
    for (const label of ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"]) expect(texts).toContain(label);
    for (const amount of ["$214K", "$0", "$485K", "$1.31M", "$480K", "$612K"]) expect(texts).toContain(amount);
  });

  it("picks out the current month on the axis and its point", () => {
    render(<RevenuePanel revenue={revenue} monthName="November" />);

    const texts = Array.from(screen.getByRole("img").querySelectorAll("svg text"));
    const bold = texts.filter((text) => text.getAttribute("font-weight") === "600").map((text) => text.textContent);
    expect(bold).toEqual(expect.arrayContaining(["Nov", "$612K"]));
    expect(bold).not.toContain("Oct");
  });
});

describe("WonLostChart chart", () => {
  it("labels each month, and the deals won and lost in it, leaving out zeros", () => {
    render(
      <WonLostChart months={months} won={{ this_month: 4, last_month: 1, won_6m: 11, lost_6m: 6, win_rate: 64.7 }} />,
    );

    const chart = screen.getByRole("img");
    const texts = chartTexts(chart);
    for (const label of ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"]) expect(texts).toContain(label);
    const counts = texts.filter((text) => /^\d+$/.test(text ?? ""));
    // Won: 1, 2, 3, 1, 4. Lost: 2, 1, 3. No label for a month with none.
    expect(counts.sort()).toEqual(["1", "1", "1", "2", "2", "3", "3", "4"]);
    expect(chart.querySelectorAll("rect").length).toBeGreaterThanOrEqual(8);
  });

  it("draws no bars when nothing was won or lost", () => {
    const quiet = months.map((m) => ({ ...m, won_count: 0, lost_count: 0 }));
    render(
      <WonLostChart months={quiet} won={{ this_month: 0, last_month: 0, won_6m: 0, lost_6m: 0, win_rate: null }} />,
    );

    const chart = screen.getByRole("img");
    expect(chartTexts(chart).filter((text) => /^\d+$/.test(text ?? ""))).toEqual([]);
    expect(within(chart.parentElement!).getByText("No closed deals yet")).toBeInTheDocument();
  });
});
