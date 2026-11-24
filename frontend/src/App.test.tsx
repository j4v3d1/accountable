import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { mockApi, renderApp } from "./test/renderApp";

const emptyDashboard = {
  today: "2026-11-24",
  summary: { open_deals: 0, open_value: 0, overdue_follow_ups: 0, late_deals: 0 },
  revenue: {
    this_month: 0,
    last_month: 0,
    last_month_label: "October",
    change_percent: null,
    six_month_total: 0,
    best_month: null,
    months: [],
  },
  open_pipeline: { count: 0, value: 0, expected: 0, expected_share: 0, stages: [] },
  deals_won: { this_month: 0, last_month: 0, won_6m: 0, lost_6m: 0, win_rate: null },
  funnel: [],
  follow_ups: { overdue: [], this_week: [], later: [] },
  recent_activity: [],
};

describe("App", () => {
  it("shows the dashboard at the root, with the main navigation", async () => {
    mockApi({ "GET /dashboard": emptyDashboard });
    renderApp("/");

    expect(await screen.findByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
  });

  it("shows each section at its address", async () => {
    mockApi({ "GET /deals": [], "GET /stages": [], "GET /contacts": [], "GET /organizations": [] });

    const { unmount } = renderApp("/pipeline");
    expect(await screen.findByRole("heading", { level: 1, name: "Pipeline" })).toBeInTheDocument();
    unmount();

    for (const [path, title] of [
      ["/deals", "Deals"],
      ["/contacts", "Contacts"],
      ["/organizations", "Organizations"],
    ]) {
      const page = renderApp(path);
      expect(await screen.findByRole("heading", { level: 1, name: title })).toBeInTheDocument();
      page.unmount();
    }
  });

  it("says when there's no page at an address, and links back to the dashboard", async () => {
    const user = userEvent.setup();
    mockApi({ "GET /dashboard": emptyDashboard });
    renderApp("/no-such-page");

    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByText("There's no page at this address.")).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: "Go to the dashboard" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
  });
});
