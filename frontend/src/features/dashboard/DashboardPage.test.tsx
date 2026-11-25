import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FakeResponse, mockApi, renderApp, requests } from "../../test/renderApp";
import type { Activity } from "../activities/types";
import type { Dashboard } from "./types";

function activity(id: number, description: string, extra: Partial<Activity> = {}): Activity {
  return {
    id,
    type: "call",
    contact_id: 7,
    contact_name: "Rachel Kim",
    deal_id: null,
    deal_name: null,
    description,
    occurred_at: "2026-11-20T12:00:00Z",
    follow_up_date: null,
    done: false,
    from_stage: null,
    to_stage: null,
    created_at: "2026-11-20T12:00:00Z",
    updated_at: "2026-11-20T12:00:00Z",
    created_by_name: "Sample data",
    updated_by_name: "Sample data",
    ...extra,
  };
}

const MONTHS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];

function dashboard(extra: Partial<Dashboard> = {}): Dashboard {
  return {
    today: "2026-11-24",
    summary: { open_deals: 3, open_value: 1415000, overdue_follow_ups: 1, late_deals: 1 },
    revenue: {
      this_month: 612000,
      last_month: 480000,
      last_month_label: "October",
      change_percent: 27.5,
      six_month_total: 2400000,
      best_month: { month: "2026-11", label: "Nov", value: 612000 },
      months: MONTHS.map((label, i) => ({
        month: `2026-${String(i + 6).padStart(2, "0")}`,
        label,
        won_value: i * 100000,
        won_count: i,
        lost_count: i % 2,
      })),
    },
    open_pipeline: {
      count: 3,
      value: 1415000,
      expected: 393000,
      expected_share: 27.8,
      stages: [
        { key: "new_lead", label: "New Lead", value: 0, count: 0 },
        { key: "qualified", label: "Qualified", value: 415000, count: 1 },
        { key: "showing", label: "Showing", value: 0, count: 0 },
        { key: "offer", label: "Offer", value: 1000000, count: 2 },
        { key: "under_contract", label: "Under Contract", value: 0, count: 0 },
      ],
    },
    deals_won: { this_month: 2, last_month: 1, won_6m: 15, lost_6m: 3, win_rate: 83.3 },
    funnel: [
      { key: "new_lead", label: "New Lead", value: 4000000, count: 12, share_from_previous: null },
      { key: "qualified", label: "Qualified", value: 3000000, count: 9, share_from_previous: 75 },
      { key: "offer", label: "Offer", value: 1000000, count: 4, share_from_previous: 44.4 },
    ],
    follow_ups: {
      overdue: [activity(1, "Call Rachel about the inspection report", { follow_up_date: "2026-11-19" })],
      this_week: [
        activity(2, "Send the offer to Omar", {
          follow_up_date: "2026-11-26",
          contact_id: null,
          contact_name: null,
          deal_id: 4,
          deal_name: "12 Birch Lane purchase",
        }),
      ],
      later: [activity(3, "Check in after the holidays", { follow_up_date: "2027-01-05" })],
    },
    recent_activity: [
      activity(10, "Moved to Offer", {
        type: "stage_change",
        contact_id: null,
        contact_name: null,
        deal_id: 4,
        deal_name: "12 Birch Lane purchase",
      }),
      activity(11, "Talked through the inspection", { type: "note", created_by_name: "Maya Torres" }),
      activity(12, "A note on nothing", { type: "email", contact_id: null, contact_name: null }),
    ],
    ...extra,
  };
}

function empty(): Dashboard {
  const base = dashboard();
  return {
    ...base,
    summary: { open_deals: 0, open_value: 0, overdue_follow_ups: 0, late_deals: 0 },
    revenue: {
      ...base.revenue,
      this_month: 0,
      change_percent: null,
      six_month_total: 0,
      best_month: null,
      months: base.revenue.months.map((m) => ({ ...m, won_value: 0, won_count: 0, lost_count: 0 })),
    },
    open_pipeline: {
      count: 0,
      value: 0,
      expected: 0,
      expected_share: 0,
      stages: base.open_pipeline.stages.map((s) => ({ ...s, value: 0, count: 0 })),
    },
    deals_won: { this_month: 0, last_month: 0, won_6m: 0, lost_6m: 0, win_rate: null },
    funnel: base.funnel.map((s) => ({ ...s, value: 0, count: 0, share_from_previous: null })),
    follow_ups: { overdue: [], this_week: [], later: [] },
    recent_activity: [],
  };
}

function region(name: string) {
  return screen.getByRole("region", { name });
}

describe("Dashboard", () => {
  it("says it's loading until the figures arrive", async () => {
    mockApi({ "GET /dashboard": dashboard() });
    renderApp("/");

    expect(screen.getByRole("status")).toHaveTextContent("Loading the dashboard...");
    expect(await screen.findByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
  });

  it("shows the date and the summary line", async () => {
    mockApi({ "GET /dashboard": dashboard() });
    renderApp("/");

    expect(await screen.findByText("Tuesday, November 24")).toBeInTheDocument();
    expect(screen.getByText(/worth/).closest("p")).toHaveTextContent(
      "3 open deals worth $1,415,000. 1 follow-up is overdue and 1 deal is past its close date.",
    );
  });

  it("shows revenue won this month and the change from last month", async () => {
    mockApi({ "GET /dashboard": dashboard() });
    renderApp("/");

    const revenue = await screen.findByRole("region", { name: "Revenue won" });
    expect(within(revenue).getByText("Revenue won in November (USD)")).toBeInTheDocument();
    expect(within(revenue).getByText("$612,000")).toBeInTheDocument();
    expect(within(revenue).getByText("28% from October")).toBeInTheDocument();
    expect(within(revenue).getByText("$2.4M")).toBeInTheDocument();
    expect(within(revenue).getByText("Nov · $612K")).toBeInTheDocument();
    expect(within(revenue).getByRole("img")).toHaveAccessibleName(
      "Revenue won per month: Jun $0, Jul $100K, Aug $200K, Sep $300K, Oct $400K, Nov $500K",
    );
  });

  it("shows open pipeline, expected revenue and deals won", async () => {
    mockApi({ "GET /dashboard": dashboard() });
    renderApp("/");

    const pipeline = await screen.findByRole("region", { name: "Open pipeline (USD)" });
    expect(pipeline).toHaveTextContent("$1,415,000");
    expect(pipeline).toHaveTextContent("3 open deals");
    expect(region("Expected revenue (USD)")).toHaveTextContent("$393,000");
    expect(region("Expected revenue (USD)")).toHaveTextContent("28%");
    expect(region("Deals won this month")).toHaveTextContent("2");
    expect(region("Deals won this month")).toHaveTextContent("1 in October · 83% win rate");
  });

  it("shows the funnel, with the share moving on from each stage", async () => {
    mockApi({ "GET /dashboard": dashboard() });
    renderApp("/");

    const funnel = await screen.findByRole("region", { name: "Sales funnel" });
    const rows = within(funnel).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual(["New Lead12$4M", "Qualified9$3M 75%", "Offer4$1M 44%"]);
    expect(within(funnel).getByLabelText("12 deals")).toBeInTheDocument();
  });

  it("shows deals won and lost over six months", async () => {
    mockApi({ "GET /dashboard": dashboard() });
    renderApp("/");

    const chart = await screen.findByRole("region", { name: "Won and lost" });
    expect(within(chart).getByRole("img")).toHaveAccessibleName(/Nov: 5 won, 1 lost/);
    expect(within(chart).getByText("15")).toBeInTheDocument();
    expect(within(chart).getByText("3")).toBeInTheDocument();
    expect(within(chart).getByText("83%")).toBeInTheDocument();
  });

  it("links the pipeline strip to the pipeline, with each stage's value and count", async () => {
    mockApi({ "GET /dashboard": dashboard() });
    renderApp("/");

    const strip = await screen.findByRole("region", { name: "Pipeline by stage" });
    expect(within(strip).getByRole("link", { name: "Open the pipeline" })).toHaveAttribute("href", "/pipeline");
    expect(strip).toHaveTextContent("Offer$1M2 deals");
    expect(strip).toHaveTextContent("Qualified$415K1 deal");
  });

  it("groups follow-ups and links each to its contact or deal", async () => {
    mockApi({ "GET /dashboard": dashboard() });
    renderApp("/");

    const followUps = await screen.findByRole("region", { name: /Follow-ups/ });
    expect(within(followUps).getByRole("heading", { name: "Follow-ups 3" })).toBeInTheDocument();
    const overdue = within(followUps).getByRole("list", { name: "Overdue" });
    expect(overdue).toHaveTextContent("Call Rachel about the inspection report");
    expect(overdue).toHaveTextContent("Overdue · Nov 19");
    expect(within(overdue).getByRole("link", { name: "Rachel Kim" })).toHaveAttribute("href", "/contacts/7");
    const thisWeek = within(followUps).getByRole("list", { name: "This week" });
    expect(thisWeek).toHaveTextContent("Nov 26");
    expect(within(thisWeek).getByRole("link", { name: "12 Birch Lane purchase" })).toHaveAttribute("href", "/deals/4");
    expect(within(followUps).getByRole("list", { name: "Later" })).toHaveTextContent("Jan 5");
  });

  it("marks a follow-up done, says so, and refreshes the dashboard", async () => {
    const user = userEvent.setup();
    let calls = 0;
    mockApi({
      "GET /dashboard": () => {
        calls += 1;
        const data = dashboard();
        return calls === 1 ? data : { ...data, follow_ups: { ...data.follow_ups, overdue: [] } };
      },
      "PATCH /activities/1": activity(1, "Call Rachel about the inspection report", { done: true }),
    });
    renderApp("/");

    await user.click(await screen.findByRole("button", { name: "Mark done: Call Rachel about the inspection report" }));

    expect(await screen.findByText("Follow-up done")).toBeInTheDocument();
    expect(requests).toContainEqual({ method: "PATCH", path: "/activities/1", body: { done: true } });
    expect(await screen.findByRole("heading", { name: "Follow-ups 2" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Overdue" })).not.toBeInTheDocument();
  });

  it("says why a follow-up couldn't be marked done", async () => {
    const user = userEvent.setup();
    mockApi({
      "GET /dashboard": dashboard(),
      "PATCH /activities/2": new FakeResponse(404, { detail: "Activity not found" }),
    });
    renderApp("/");

    await user.click(await screen.findByRole("button", { name: "Mark done: Send the offer to Omar" }));

    expect(await screen.findByText("Activity not found")).toBeInTheDocument();
  });

  it("lists recent activity, linked to its contact or deal", async () => {
    mockApi({ "GET /dashboard": dashboard() });
    renderApp("/");

    const recent = await screen.findByRole("region", { name: "Recent activity" });
    const items = within(recent).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Moved to Offer");
    expect(within(items[0]).getByRole("link", { name: "12 Birch Lane purchase" })).toBeInTheDocument();
    expect(within(items[1]).getByRole("link", { name: "Rachel Kim" })).toBeInTheDocument();
    expect(within(items[2]).queryByRole("link")).not.toBeInTheDocument();
  });

  it("names who added each recent activity after its date", async () => {
    mockApi({ "GET /dashboard": dashboard() });
    renderApp("/");

    const recent = await screen.findByRole("region", { name: "Recent activity" });
    const items = within(recent).getAllByRole("listitem");
    expect(items[1]).toHaveTextContent(/Maya Torres$/);
    expect(items[0]).toHaveTextContent(/Sample data$/);
  });

  it("explains each empty panel when there's nothing yet", async () => {
    mockApi({ "GET /dashboard": empty() });
    renderApp("/");

    expect(await screen.findByText("No open deals yet. Add a deal to start the pipeline.")).toBeInTheDocument();
    expect(screen.getByText("No revenue won in October")).toBeInTheDocument();
    expect(screen.getByText("None yet")).toBeInTheDocument();
    expect(region("Expected revenue (USD)")).toHaveTextContent("0%");
    expect(region("Deals won this month")).toHaveTextContent("0 in October · No closed deals yet");
    expect(region("Open pipeline (USD)")).toHaveTextContent("0 open deals");
    expect(
      screen.getByText("No follow-ups due. Log an activity with a follow-up date to see it here."),
    ).toBeInTheDocument();
    expect(screen.getByText("No activity yet. Log a call, email or note on a contact or deal.")).toBeInTheDocument();
  });

  it("shows when revenue fell, or stayed the same", async () => {
    const base = dashboard();
    mockApi({ "GET /dashboard": { ...base, revenue: { ...base.revenue, change_percent: -12.4 } } });
    const { unmount } = renderApp("/");
    expect(await screen.findByText("12% from October")).toBeInTheDocument();
    unmount();

    mockApi({ "GET /dashboard": { ...base, revenue: { ...base.revenue, change_percent: 0.2 } } });
    renderApp("/");
    expect(await screen.findByText("Same as October")).toBeInTheDocument();
  });

  it("says why the dashboard couldn't load, and loads it on Try again", async () => {
    const user = userEvent.setup();
    let calls = 0;
    mockApi({
      "GET /dashboard": () => {
        calls += 1;
        return calls === 1 ? new FakeResponse(502) : dashboard();
      },
    });
    renderApp("/");

    expect(await screen.findByRole("alert")).toHaveTextContent("Can't reach Accountable's server. Is it running?");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
  });

  it("opens Log activity and New deal", async () => {
    const user = userEvent.setup();
    mockApi({
      "GET /dashboard": dashboard(),
      "GET /contacts": [],
      "GET /deals": [],
      "GET /stages": [{ key: "new_lead", label: "New Lead", probability: 10, open: true }],
      "GET /organizations": [],
    });
    renderApp("/");

    await user.click(await screen.findByRole("button", { name: "Log activity" }));
    expect(screen.getByRole("dialog", { name: "Log activity" })).toBeInTheDocument();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "New deal" }));
    expect(screen.getByRole("dialog", { name: "New deal" })).toBeInTheDocument();
  });
});
