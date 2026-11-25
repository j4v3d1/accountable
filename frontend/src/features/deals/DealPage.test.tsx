import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FakeResponse, mockApi, renderApp, requests } from "../../test/renderApp";
import type { DealDetail, Stage } from "./types";

const stages: Stage[] = [
  { key: "new_lead", label: "New Lead", probability: 10, open: true },
  { key: "offer", label: "Offer", probability: 60, open: true },
  { key: "under_contract", label: "Under Contract", probability: 90, open: true },
  { key: "closed_won", label: "Closed (Won)", probability: 100, open: false },
  { key: "lost", label: "Lost", probability: 0, open: false },
];

const maple: DealDetail = {
  id: 3,
  name: "142 Maple Ave purchase",
  contact_id: 4,
  contact_name: "Dana Whitfield",
  organization_id: 2,
  organization_name: "Northgate Realty",
  stage: "offer",
  value: 585000,
  probability: 60,
  expected_value: 351000,
  close_date: "2026-12-30",
  position: 0,
  notes: "Buyer wants a January move-in.",
  late: false,
  created_at: "2026-10-01T09:00:00Z",
  updated_at: "2026-10-01T09:00:00Z",
  created_by_name: "Sample data",
  updated_by_name: "Sample data",
  contact: { id: 4, name: "Dana Whitfield" },
  organization: { id: 2, name: "Northgate Realty" },
  timeline: [
    {
      id: 11,
      type: "call",
      contact_id: null,
      contact_name: null,
      deal_id: 3,
      deal_name: "142 Maple Ave purchase",
      description: "Talked through the counter-offer",
      occurred_at: "2026-11-02T15:30:00Z",
      follow_up_date: null,
      done: false,
      from_stage: null,
      to_stage: null,
      created_at: "2026-11-02T15:30:00Z",
      updated_at: "2026-11-02T15:30:00Z",
      created_by_name: "Sample data",
      updated_by_name: "Sample data",
    },
  ],
};

const unlinked: DealDetail = {
  ...maple,
  contact_id: null,
  contact_name: null,
  organization_id: null,
  organization_name: null,
  contact: null,
  organization: null,
  notes: null,
  late: true,
  close_date: "2026-11-10",
  timeline: [],
};

function api(routes: Record<string, unknown> = {}) {
  mockApi({
    "GET /deals/3": maple,
    "GET /stages": stages,
    "GET /contacts": [],
    "GET /organizations": [],
    ...routes,
  });
}

function details() {
  return within(screen.getByRole("region", { name: "Details" }));
}

describe("a deal's page", () => {
  it("says it's loading, then shows the deal's details and timeline", async () => {
    api();
    renderApp("/deals/3");

    expect(screen.getByText("Loading deal...")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "142 Maple Ave purchase" })).toBeInTheDocument();
    expect(await details().findByText("Offer")).toBeInTheDocument();
    expect(details().getByText("$585,000")).toBeInTheDocument();
    expect(details().getByRole("img", { name: "60% probability" })).toBeInTheDocument();
    expect(details().getByText("60%")).toBeInTheDocument();
    expect(details().getByText("$351,000")).toBeInTheDocument();
    expect(details().getByText("Dec 30, 2026")).toBeInTheDocument();
    expect(details().getByRole("link", { name: "Dana Whitfield" })).toHaveAttribute("href", "/contacts/4");
    expect(details().getByRole("link", { name: "Northgate Realty" })).toHaveAttribute("href", "/organizations/2");
    expect(details().getByText("Buyer wants a January move-in.")).toBeInTheDocument();
    expect(screen.getByText("Talked through the counter-offer")).toBeInTheDocument();
  });

  it("says who added the deal, who last changed it, and who added each timeline entry", async () => {
    api({
      "GET /deals/3": {
        ...maple,
        created_by_name: "Priya Shah",
        updated_by_name: "jordan@example.com",
        updated_at: "2026-11-12T15:00:00Z",
        timeline: [{ ...maple.timeline[0], created_by_name: "Sam Okafor" }],
      },
    });
    renderApp("/deals/3");

    await screen.findByRole("heading", { level: 1, name: "142 Maple Ave purchase" });
    expect(details().getByText(/^Added by/)).toHaveTextContent("Added by Priya Shah on Oct 1, 2026");
    expect(details().getByText(/^Last changed by/)).toHaveTextContent(
      "Last changed by jordan@example.com on Nov 12, 2026",
    );
    expect(screen.getByText("Talked through the counter-offer").closest("li")).toHaveTextContent(
      /Nov 2, 2026.*Sam Okafor/,
    );
  });

  it("says when a deal has no contact, organization or notes, and marks it late", async () => {
    api({ "GET /deals/3": unlinked });
    renderApp("/deals/3");

    await screen.findByRole("heading", { name: "142 Maple Ave purchase" });
    expect(details().getAllByText("None")).toHaveLength(2);
    expect(details().getByText("No notes")).toBeInTheDocument();
    expect(details().getByText("Late")).toBeInTheDocument();
    expect(screen.getByText("No activities yet. Log one to start the timeline.")).toBeInTheDocument();
  });

  it("says when the deal doesn't exist, with a way back to the list", async () => {
    api({ "GET /deals/3": new FakeResponse(404, null) });
    renderApp("/deals/3");

    expect(await screen.findByRole("alert")).toHaveTextContent("That record no longer exists.");
    expect(screen.getByRole("link", { name: "Back to deals" })).toHaveAttribute("href", "/deals");
  });

  it("tries loading again after an error", async () => {
    const user = userEvent.setup();
    let calls = 0;
    api({ "GET /deals/3": () => (++calls === 1 ? new FakeResponse(500) : maple) });
    renderApp("/deals/3");

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("heading", { name: "142 Maple Ave purchase" })).toBeInTheDocument();
  });

  it("edits the deal and shows the saved details", async () => {
    const user = userEvent.setup();
    let current = maple;
    api({
      "GET /deals/3": () => current,
      "PATCH /deals/3": (body: unknown) => {
        current = { ...maple, ...(body as object) };
        return current;
      },
    });
    renderApp("/deals/3");

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit deal" });
    const name = within(dialog).getByLabelText("Name");
    await user.clear(name);
    await user.type(name, "142 Maple Ave purchase (backup offer)");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("heading", { name: "142 Maple Ave purchase (backup offer)" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Edit deal" })).not.toBeInTheDocument();
    expect(screen.getByText("Deal saved")).toBeInTheDocument();
  });

  it("waits for the stages before showing the edit form", async () => {
    const user = userEvent.setup();
    api({ "GET /stages": new FakeResponse(503) });
    renderApp("/deals/3");

    await user.click(await screen.findByRole("button", { name: "Edit" }));

    const dialog = await screen.findByRole("dialog", { name: "Edit deal" });
    expect(within(dialog).getByText("Loading stages...")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("deletes the deal and goes back to the deals list", async () => {
    const user = userEvent.setup();
    api({ "GET /deals/3/delete-impact": { activities: 1 }, "DELETE /deals/3": null, "GET /deals": [] });
    renderApp("/deals/3");

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Delete 142 Maple Ave purchase?" });
    expect(await within(dialog).findByText("1 activity will be deleted.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("heading", { name: "Deals" })).toBeInTheDocument();
    expect(await screen.findByText("Deal deleted")).toBeInTheDocument();
    const afterDelete = requests.slice(requests.findIndex((r) => r.method === "DELETE"));
    expect(afterDelete.some((r) => r.method === "GET" && r.path === "/deals/3")).toBe(false);
  });

  it("lets the user try again when the delete counts can't load", async () => {
    const user = userEvent.setup();
    let calls = 0;
    api({
      "GET /deals/3/delete-impact": () => (++calls === 1 ? new FakeResponse(502) : { activities: 2 }),
    });
    renderApp("/deals/3");

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(await within(dialog).findByText(/Couldn't check linked records/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Try again" }));

    expect(await within(dialog).findByText("2 activities will be deleted.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Delete" })).toBeEnabled();
  });
});
