import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RevenuePanel } from "./RevenuePanel";
import type { Dashboard } from "./types";
import { WonLostChart } from "./WonLostChart";

// The spec sets money, counts, percentages and dates in JetBrains Mono ("mono").
// Wording that stands in for a missing figure is ordinary text.

const months = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"].map((label, i) => ({
  month: `2026-${String(i + 6).padStart(2, "0")}`,
  label,
  won_value: 0,
  won_count: 0,
  lost_count: 0,
}));

function revenue(best: Dashboard["revenue"]["best_month"]): Dashboard["revenue"] {
  return {
    this_month: 0,
    last_month: 0,
    last_month_label: "October",
    change_percent: null,
    six_month_total: best?.value ?? 0,
    best_month: best,
    months,
  };
}

function wonLost(win_rate: number | null): Dashboard["deals_won"] {
  return { this_month: 0, last_month: 0, won_6m: 0, lost_6m: 0, win_rate };
}

describe("figure font", () => {
  it("sets the best month in the figure font, and 'None yet' in the text font", () => {
    const { unmount } = render(
      <RevenuePanel revenue={revenue({ month: "2026-09", label: "Sep", value: 1310000 })} monthName="November" />,
    );
    expect(screen.getByText("Sep · $1.31M")).toHaveClass("mono");
    unmount();

    render(<RevenuePanel revenue={revenue(null)} monthName="November" />);
    expect(screen.getByText("None yet")).not.toHaveClass("mono");
  });

  it("sets the win rate in the figure font, and 'No closed deals yet' in the text font", () => {
    const { unmount } = render(<WonLostChart won={wonLost(57.1)} months={months} />);
    expect(screen.getByText("57%")).toHaveClass("mono");
    unmount();

    render(<WonLostChart won={wonLost(null)} months={months} />);
    expect(screen.getByText("No closed deals yet")).not.toHaveClass("mono");
  });
});
