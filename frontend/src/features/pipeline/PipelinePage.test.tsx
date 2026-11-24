import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FakeResponse, mockApi, renderApp } from "../../test/renderApp";
import type { Deal, DealDetail, Stage, StageKey } from "../deals/types";

const stages: Stage[] = [
  { key: "new_lead", label: "New Lead", probability: 10, open: true },
  { key: "qualified", label: "Qualified", probability: 20, open: true },
  { key: "showing", label: "Showing", probability: 40, open: true },
  { key: "offer", label: "Offer", probability: 60, open: true },
  { key: "under_contract", label: "Under Contract", probability: 90, open: true },
  { key: "closed_won", label: "Closed (Won)", probability: 100, open: false },
  { key: "lost", label: "Lost", probability: 0, open: false },
];

function deal(id: number, name: string, stage: StageKey, position: number, extra: Partial<Deal> = {}): Deal {
  const probability = stages.find((s) => s.key === stage)!.probability;
  const value = extra.value ?? 100000;
  return {
    id,
    name,
    contact_id: null,
    contact_name: null,
    organization_id: null,
    organization_name: null,
    stage,
    value,
    probability,
    expected_value: (value * probability) / 100,
    close_date: "2027-03-01",
    position,
    notes: null,
    late: false,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    ...extra,
  };
}

const deals: Deal[] = [
  deal(1, "12 Birch Lane purchase", "qualified", 0, {
    value: 415000,
    contact_name: "Priya Nair",
    organization_name: "Northgate Realty Partners",
  }),
  deal(2, "Harbor Point listing", "offer", 0, {
    value: 1000000,
    close_date: "2026-11-01",
    late: true,
    organization_name: "Ridgeline Development",
  }),
  deal(3, "33 Laurel St sale", "closed_won", 0, { value: 612000, close_date: "2026-11-12" }),
  deal(4, "Cedar Court lease", "lost", 0, { value: 50000 }),
];

function column(label: string) {
  return screen.getByRole("region", { name: `${label} column` });
}

describe("Pipeline page", () => {
  it("says it's loading, then shows a column for every stage", async () => {
    mockApi({ "GET /deals": deals, "GET /stages": stages });
    renderApp("/pipeline");

    expect(screen.getByRole("status")).toHaveTextContent("Loading the pipeline...");
    expect(await screen.findByRole("region", { name: "New Lead column" })).toBeInTheDocument();
    expect(screen.getAllByRole("region", { name: / column$/ })).toHaveLength(7);
    expect(screen.getByText("2 open deals")).toBeInTheDocument();
  });

  it("totals the open deals only, and counts the late ones", async () => {
    mockApi({ "GET /deals": deals, "GET /stages": stages });
    renderApp("/pipeline");

    const summary = await screen.findByRole("region", { name: "Pipeline summary" });
    expect(within(summary).getByTestId("summary-value")).toHaveTextContent("$1,415,000");
    expect(within(summary).getByTestId("summary-expected")).toHaveTextContent("$683,000");
    expect(within(summary).getByTestId("summary-late")).toHaveTextContent("1 deal");
    expect(within(summary).getByRole("img")).toHaveAccessibleName(/Offer \$1M, 1 deals/);
  });

  it("totals each column, and marks closed columns as all time", async () => {
    mockApi({ "GET /deals": deals, "GET /stages": stages });
    renderApp("/pipeline");

    const offer = await screen.findByRole("region", { name: "Offer column" });
    expect(within(offer).getByLabelText("1 deals")).toHaveTextContent("1");
    expect(offer).toHaveTextContent("$1M");
    expect(offer).toHaveTextContent("Expected $600K");
    expect(column("Closed (Won)")).toHaveTextContent("All time");
    expect(within(column("Showing")).getByLabelText("0 deals")).toBeInTheDocument();
  });

  it("shows who each deal is with, its value and its close date, or that it's late", async () => {
    mockApi({ "GET /deals": deals, "GET /stages": stages });
    renderApp("/pipeline");

    const card = await screen.findByRole("button", { name: /12 Birch Lane purchase/ });
    expect(card).toHaveTextContent("Priya Nair · Northgate Realty Partners");
    expect(card).toHaveTextContent("$415,000");
    expect(card).toHaveTextContent("Mar 1");
    expect(card).toHaveTextContent("20%");
    const late = screen.getByRole("button", { name: /Harbor Point listing/ });
    expect(late).toHaveTextContent("Late · Nov 1");
    expect(late).toHaveTextContent("Ridgeline Development");
  });

  it("says no deals are late when none are", async () => {
    mockApi({ "GET /deals": [], "GET /stages": stages });
    renderApp("/pipeline");

    expect(await screen.findByTestId("summary-late")).toHaveTextContent("0 deals");
    expect(screen.getByTestId("summary-value")).toHaveTextContent("$0");
    expect(screen.getByText("0 open deals")).toBeInTheDocument();
  });

  it("says why the pipeline couldn't load, and loads it on Try again", async () => {
    const user = userEvent.setup();
    let calls = 0;
    mockApi({
      "GET /deals": () => {
        calls += 1;
        return calls === 1 ? new FakeResponse(500, { detail: "Database is locked" }) : deals;
      },
      "GET /stages": stages,
    });
    renderApp("/pipeline");

    expect(await screen.findByRole("alert")).toHaveTextContent("Database is locked");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("region", { name: "Offer column" })).toBeInTheDocument();
  });

  it("opens a deal when its card is clicked, or when Enter is pressed on it", async () => {
    const user = userEvent.setup();
    const detail: DealDetail = { ...deals[0], contact: null, organization: null, timeline: [] };
    mockApi({ "GET /deals": deals, "GET /stages": stages, "GET /deals/1": detail });
    const { unmount } = renderApp("/pipeline");

    await user.click(await screen.findByRole("button", { name: /12 Birch Lane purchase/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "12 Birch Lane purchase" })).toBeInTheDocument();
    unmount();

    renderApp("/pipeline");
    (await screen.findByRole("button", { name: /12 Birch Lane purchase/ })).focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("heading", { level: 1, name: "12 Birch Lane purchase" })).toBeInTheDocument();
  });

  it("adds a deal to the column whose Add deal was pressed, or to New Lead from the header", async () => {
    const user = userEvent.setup();
    mockApi({ "GET /deals": deals, "GET /stages": stages, "GET /contacts": [], "GET /organizations": [] });
    renderApp("/pipeline");

    await user.click(await screen.findByRole("button", { name: "Add deal to Offer" }));
    const dialog = await screen.findByRole("dialog", { name: "New deal" });
    expect(within(dialog).getByRole("combobox", { name: "Stage" })).toHaveValue("offer");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "New deal" }));
    expect(
      within(await screen.findByRole("dialog", { name: "New deal" })).getByRole("combobox", { name: "Stage" }),
    ).toHaveValue("new_lead");
  });
});
