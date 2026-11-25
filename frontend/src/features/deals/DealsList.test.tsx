import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FakeResponse, mockApi, renderApp, requests } from "../../test/renderApp";
import type { Deal, Stage } from "./types";

const stages: Stage[] = [
  { key: "new_lead", label: "New Lead", probability: 10, open: true },
  { key: "qualified", label: "Qualified", probability: 20, open: true },
  { key: "showing", label: "Showing", probability: 40, open: true },
  { key: "offer", label: "Offer", probability: 60, open: true },
  { key: "under_contract", label: "Under Contract", probability: 90, open: true },
  { key: "closed_won", label: "Closed (Won)", probability: 100, open: false },
  { key: "lost", label: "Lost", probability: 0, open: false },
];

function deal(overrides: Partial<Deal> & Pick<Deal, "id" | "name">): Deal {
  return {
    contact_id: null,
    contact_name: null,
    organization_id: null,
    organization_name: null,
    stage: "new_lead",
    value: 400000,
    probability: 10,
    expected_value: 40000,
    close_date: "2026-12-15",
    position: 0,
    notes: null,
    late: false,
    created_at: "2026-10-01T09:00:00Z",
    updated_at: "2026-10-01T09:00:00Z",
    created_by_name: "Sample data",
    updated_by_name: "Sample data",
    ...overrides,
  };
}

const deals: Deal[] = [
  deal({
    id: 1,
    name: "142 Maple Ave purchase",
    stage: "offer",
    value: 585000,
    probability: 60,
    expected_value: 351000,
    contact_id: 4,
    contact_name: "Dana Whitfield",
    organization_id: 2,
    organization_name: "Northgate Realty",
  }),
  deal({ id: 2, name: "88 Birchwood Ct listing", value: 320000, expected_value: 32000, late: true }),
  deal({ id: 3, name: "Lakeview condo sale", stage: "closed_won", value: 710000, probability: 100 }),
];

function api(routes: Record<string, unknown> = {}) {
  mockApi({ "GET /deals": deals, "GET /stages": stages, "GET /contacts": [], "GET /organizations": [], ...routes });
}

function dealNames() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent);
}

describe("the deals list", () => {
  it("says it's loading, then lists every deal with how many are still open", async () => {
    api();
    renderApp("/deals");

    expect(screen.getByText("Loading deals...")).toBeInTheDocument();
    expect(await screen.findByText("3 deals, 2 open")).toBeInTheDocument();
    const maple = screen.getByRole("row", { name: /142 Maple Ave purchase/ });
    expect(within(maple).getByText("Offer")).toBeInTheDocument();
    expect(within(maple).getByText("$585,000")).toBeInTheDocument();
    expect(within(maple).getByText("60%")).toBeInTheDocument();
    expect(within(maple).getByText("$351,000")).toBeInTheDocument();
    expect(within(maple).getByText("Dec 15, 2026")).toBeInTheDocument();
    expect(within(maple).getByText("Dana Whitfield")).toBeInTheDocument();
    expect(within(maple).getByText("Northgate Realty")).toBeInTheDocument();
  });

  it("marks a deal that's past its close date as late", async () => {
    api();
    renderApp("/deals");

    const late = await screen.findByRole("row", { name: /88 Birchwood Ct listing/ });
    expect(within(late).getByText("Late")).toBeInTheDocument();
    expect(within(screen.getByRole("row", { name: /142 Maple Ave/ })).queryByText("Late")).not.toBeInTheDocument();
  });

  it("sorts by value and by stage in pipeline order", async () => {
    const user = userEvent.setup();
    api();
    renderApp("/deals");
    await screen.findByText("3 deals, 2 open");

    await user.click(screen.getByRole("button", { name: "Value (USD)" }));
    expect(dealNames()).toEqual(["88 Birchwood Ct listing", "142 Maple Ave purchase", "Lakeview condo sale"]);

    await user.click(screen.getByRole("button", { name: "Stage" }));
    expect(dealNames()).toEqual(["88 Birchwood Ct listing", "142 Maple Ave purchase", "Lakeview condo sale"]);
    await user.click(screen.getByRole("button", { name: "Stage" }));
    expect(dealNames()).toEqual(["Lakeview condo sale", "142 Maple Ave purchase", "88 Birchwood Ct listing"]);
  });

  it("finds deals by contact or organization", async () => {
    const user = userEvent.setup();
    api();
    renderApp("/deals");

    await user.type(await screen.findByRole("searchbox", { name: "Search deals" }), "northgate");

    expect(dealNames()).toEqual(["142 Maple Ave purchase"]);
  });

  it("opens a deal's page from the list", async () => {
    const user = userEvent.setup();
    api({
      "GET /deals/1": { ...deals[0], contact: null, organization: null, timeline: [] },
    });
    renderApp("/deals");

    await user.click(await screen.findByRole("link", { name: "142 Maple Ave purchase" }));

    expect(await screen.findByRole("heading", { name: "142 Maple Ave purchase" })).toBeInTheDocument();
  });

  it("invites adding the first deal when there are none", async () => {
    const user = userEvent.setup();
    api({ "GET /deals": [] });
    renderApp("/deals");

    expect(await screen.findByText("No deals yet. Add one to start the pipeline.")).toBeInTheDocument();
    expect(screen.getByText("0 deals, 0 open")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button", { name: "New deal" });
    await user.click(buttons[buttons.length - 1]);

    expect(await screen.findByRole("dialog", { name: "New deal" })).toBeInTheDocument();
  });

  it("shows why the deals couldn't load, and tries again", async () => {
    const user = userEvent.setup();
    let calls = 0;
    api({
      "GET /deals": () => (++calls === 1 ? new FakeResponse(500, { detail: "The database is busy." }) : deals),
    });
    renderApp("/deals");

    expect(await screen.findByRole("alert")).toHaveTextContent("The database is busy.");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("3 deals, 2 open")).toBeInTheDocument();
  });

  it("shows an error when the stages can't load", async () => {
    api({ "GET /stages": new FakeResponse(503) });
    renderApp("/deals");

    expect(await screen.findByRole("alert")).toHaveTextContent("Can't reach Accountable's server. Is it running?");
  });
});

describe("adding and editing deals from the list", () => {
  it("adds a deal and confirms it was saved", async () => {
    const user = userEvent.setup();
    api({ "POST /deals": (body: unknown) => ({ ...deals[1], ...(body as object), id: 9 }) });
    renderApp("/deals");

    await user.click(await screen.findByRole("button", { name: "New deal" }));
    const dialog = await screen.findByRole("dialog", { name: "New deal" });
    await user.type(within(dialog).getByLabelText("Name"), "17 Harbor Rd purchase");
    await user.type(within(dialog).getByLabelText("Value (USD)"), "450000");
    await user.type(within(dialog).getByLabelText("Close date"), "2027-01-20");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Deal saved")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "New deal" })).not.toBeInTheDocument();
    expect(requests.find((r) => r.method === "POST")).toEqual({
      method: "POST",
      path: "/deals",
      body: {
        name: "17 Harbor Rd purchase",
        contact_id: null,
        organization_id: null,
        stage: "new_lead",
        value: 450000,
        probability: 10,
        close_date: "2027-01-20",
        notes: null,
      },
    });
  });

  it("keeps the form open and shows the server's reason when saving fails", async () => {
    const user = userEvent.setup();
    api({ "POST /deals": new FakeResponse(422, { detail: [{ loc: ["body", "close_date"], msg: "Not a date" }] }) });
    renderApp("/deals");

    await user.click(await screen.findByRole("button", { name: "New deal" }));
    const dialog = await screen.findByRole("dialog", { name: "New deal" });
    await user.type(within(dialog).getByLabelText("Name"), "17 Harbor Rd purchase");
    await user.type(within(dialog).getByLabelText("Value (USD)"), "450000");
    await user.type(within(dialog).getByLabelText("Close date"), "2027-01-20");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("close_date: Not a date")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "New deal" })).toBeInTheDocument();
  });

  it("closes the form without saving on Cancel", async () => {
    const user = userEvent.setup();
    api();
    renderApp("/deals");

    await user.click(await screen.findByRole("button", { name: "New deal" }));
    const dialog = await screen.findByRole("dialog", { name: "New deal" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(requests.some((r) => r.method === "POST")).toBe(false);
  });

  it("edits a deal from its row, starting from its current details", async () => {
    const user = userEvent.setup();
    api({
      "GET /contacts": [
        {
          id: 4,
          first_name: "Dana",
          last_name: "Whitfield",
          name: "Dana Whitfield",
          email: null,
          phone: null,
          job_title: null,
          organization_id: 2,
          organization_name: "Northgate Realty",
          status: "customer",
          last_activity_at: null,
          created_at: "2026-10-01T09:00:00Z",
          updated_at: "2026-10-01T09:00:00Z",
          created_by_name: "Sample data",
          updated_by_name: "Sample data",
        },
      ],
      "GET /organizations": [
        {
          id: 2,
          name: "Northgate Realty",
          website: null,
          industry: "Brokerage",
          notes: null,
          contact_count: 1,
          open_deal_count: 1,
          created_at: "2026-10-01T09:00:00Z",
          updated_at: "2026-10-01T09:00:00Z",
          created_by_name: "Sample data",
          updated_by_name: "Sample data",
        },
      ],
      "PATCH /deals/1": (body: unknown) => ({ ...deals[0], ...(body as object) }),
    });
    renderApp("/deals");

    await user.click(await screen.findByRole("button", { name: "Edit 142 Maple Ave purchase" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit deal" });
    expect(within(dialog).getByLabelText("Name")).toHaveValue("142 Maple Ave purchase");
    expect(within(dialog).getByLabelText("Stage")).toHaveValue("offer");
    expect(await within(dialog).findByRole("button", { name: "Main contact" })).toHaveTextContent("Dana Whitfield");
    expect(within(dialog).getByRole("button", { name: "Organization" })).toHaveTextContent("Northgate Realty");

    await user.selectOptions(within(dialog).getByLabelText("Stage"), "under_contract");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Deal saved")).toBeInTheDocument();
    const patch = requests.find((r) => r.method === "PATCH");
    expect(patch?.path).toBe("/deals/1");
    expect(patch?.body).toMatchObject({ stage: "under_contract", probability: 90, contact_id: 4, organization_id: 2 });
  });
});

describe("deleting deals from the list", () => {
  it("says what else goes with the deal, then deletes it", async () => {
    const user = userEvent.setup();
    api({ "GET /deals/2/delete-impact": { activities: 3 }, "DELETE /deals/2": null });
    renderApp("/deals");

    await user.click(await screen.findByRole("button", { name: "Delete 88 Birchwood Ct listing" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Delete 88 Birchwood Ct listing?" });
    expect(await within(dialog).findByText("3 activities will be deleted.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Deal deleted")).toBeInTheDocument();
    expect(requests.some((r) => r.method === "DELETE" && r.path === "/deals/2")).toBe(true);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("tells the user when the server refuses the delete", async () => {
    const user = userEvent.setup();
    api({
      "GET /deals/2/delete-impact": { activities: 1 },
      "DELETE /deals/2": new FakeResponse(409, { detail: "This deal changed. Reload and try again." }),
    });
    renderApp("/deals");

    await user.click(await screen.findByRole("button", { name: "Delete 88 Birchwood Ct listing" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(await within(dialog).findByText("1 activity will be deleted.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("This deal changed. Reload and try again.")).toBeInTheDocument();
  });

  it("keeps the deal when the user cancels", async () => {
    const user = userEvent.setup();
    api({ "GET /deals/2/delete-impact": { activities: 0 } });
    renderApp("/deals");

    await user.click(await screen.findByRole("button", { name: "Delete 88 Birchwood Ct listing" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(await within(dialog).findByText("Nothing else will change.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(requests.some((r) => r.method === "DELETE")).toBe(false);
  });
});
