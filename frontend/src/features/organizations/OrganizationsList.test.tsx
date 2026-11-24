import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FakeResponse, mockApi, renderApp, requests } from "../../test/renderApp";
import type { Organization, OrganizationInput } from "./types";

function organization(overrides: Partial<Organization> & Pick<Organization, "id" | "name">): Organization {
  return {
    website: null,
    industry: null,
    notes: null,
    contact_count: 0,
    open_deal_count: 0,
    created_at: "2026-10-01T09:00:00Z",
    updated_at: "2026-10-01T09:00:00Z",
    ...overrides,
  };
}

const organizations: Organization[] = [
  organization({
    id: 1,
    name: "Northgate Realty",
    website: "https://northgaterealty.example.com/",
    industry: "Brokerage",
    contact_count: 4,
    open_deal_count: 2,
  }),
  organization({ id: 2, name: "Harbor Point Lending", industry: "Mortgage lending", contact_count: 1 }),
  organization({ id: 3, name: "Bayline Title & Escrow", contact_count: 2, open_deal_count: 5 }),
];

function api(routes: Record<string, unknown> = {}) {
  mockApi({ "GET /organizations": organizations, ...routes });
}

function names() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent);
}

describe("the organizations list", () => {
  it("says it's loading, then lists every organization", async () => {
    api();
    renderApp("/organizations");

    expect(screen.getByText("Loading organizations...")).toBeInTheDocument();
    expect(await screen.findByText("3 organizations")).toBeInTheDocument();
    const northgate = screen.getByRole("row", { name: /Northgate Realty/ });
    expect(within(northgate).getByText("Brokerage")).toBeInTheDocument();
    expect(within(northgate).getByText("northgaterealty.example.com")).toBeInTheDocument();
    expect(within(northgate).getByText("4")).toBeInTheDocument();
    expect(within(northgate).getByText("2")).toBeInTheDocument();
  });

  it("sorts by name and by open deals", async () => {
    const user = userEvent.setup();
    api();
    renderApp("/organizations");
    await screen.findByText("3 organizations");

    await user.click(screen.getByRole("button", { name: "Name" }));
    expect(names()).toEqual(["Bayline Title & Escrow", "Harbor Point Lending", "Northgate Realty"]);

    await user.click(screen.getByRole("button", { name: "Open deals" }));
    expect(names()).toEqual(["Harbor Point Lending", "Northgate Realty", "Bayline Title & Escrow"]);
  });

  it("finds organizations by industry or website", async () => {
    const user = userEvent.setup();
    api();
    renderApp("/organizations");
    const search = await screen.findByRole("searchbox", { name: "Search organizations" });

    await user.type(search, "mortgage");
    expect(names()).toEqual(["Harbor Point Lending"]);

    await user.clear(search);
    await user.type(search, "example.com");
    expect(names()).toEqual(["Northgate Realty"]);

    await user.clear(search);
    await user.type(search, "zzz");
    expect(screen.getByText('No matches for "zzz".')).toBeInTheDocument();
  });

  it("invites adding the first organization when there are none", async () => {
    const user = userEvent.setup();
    api({ "GET /organizations": [] });
    renderApp("/organizations");

    expect(await screen.findByText("No organizations yet. Add one to start.")).toBeInTheDocument();
    expect(screen.getByText("0 organizations")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button", { name: "New organization" });
    await user.click(buttons[buttons.length - 1]);

    expect(await screen.findByRole("dialog", { name: "New organization" })).toBeInTheDocument();
  });

  it("shows why the organizations couldn't load, and tries again", async () => {
    const user = userEvent.setup();
    let calls = 0;
    api({
      "GET /organizations": () => (++calls === 1 ? new FakeResponse(504) : organizations),
    });
    renderApp("/organizations");

    expect(await screen.findByRole("alert")).toHaveTextContent("Can't reach Accountable's server. Is it running?");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("3 organizations")).toBeInTheDocument();
  });
});

describe("adding and editing organizations from the list", () => {
  it("adds an organization and confirms it was saved", async () => {
    const user = userEvent.setup();
    api({ "POST /organizations": (body: unknown) => organization({ ...(body as OrganizationInput), id: 8 }) });
    renderApp("/organizations");

    await user.click(await screen.findByRole("button", { name: "New organization" }));
    const dialog = await screen.findByRole("dialog", { name: "New organization" });
    await user.type(within(dialog).getByLabelText("Name"), "Crestline Developments");
    await user.selectOptions(within(dialog).getByLabelText("Industry"), "Development");
    await user.type(within(dialog).getByLabelText("Notes"), "Building the riverside lofts");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Organization saved")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(requests.find((r) => r.method === "POST")).toEqual({
      method: "POST",
      path: "/organizations",
      body: {
        name: "Crestline Developments",
        website: null,
        industry: "Development",
        notes: "Building the riverside lofts",
      },
    });
  });

  it("keeps the form open and shows the server's reason when saving fails", async () => {
    const user = userEvent.setup();
    api({ "POST /organizations": new FakeResponse(409, { detail: "An organization with that name already exists." }) });
    renderApp("/organizations");

    await user.click(await screen.findByRole("button", { name: "New organization" }));
    const dialog = await screen.findByRole("dialog", { name: "New organization" });
    await user.type(within(dialog).getByLabelText("Name"), "Northgate Realty");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("An organization with that name already exists.")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "New organization" })).toBeInTheDocument();
  });

  it("closes the form without saving on Cancel", async () => {
    const user = userEvent.setup();
    api();
    renderApp("/organizations");

    await user.click(await screen.findByRole("button", { name: "New organization" }));
    const dialog = await screen.findByRole("dialog", { name: "New organization" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(requests.some((r) => r.method === "POST")).toBe(false);
  });

  it("edits an organization from its row", async () => {
    const user = userEvent.setup();
    api({ "PATCH /organizations/2": (body: unknown) => ({ ...organizations[1], ...(body as object) }) });
    renderApp("/organizations");

    await user.click(await screen.findByRole("button", { name: "Edit Harbor Point Lending" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit organization" });
    expect(within(dialog).getByLabelText("Industry")).toHaveValue("Mortgage lending");
    await user.type(within(dialog).getByLabelText("Website"), "harborpoint.example.com");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Organization saved")).toBeInTheDocument();
    expect(requests.find((r) => r.method === "PATCH")).toEqual({
      method: "PATCH",
      path: "/organizations/2",
      body: {
        name: "Harbor Point Lending",
        website: "harborpoint.example.com",
        industry: "Mortgage lending",
        notes: null,
      },
    });
  });
});

describe("deleting organizations from the list", () => {
  it("says which contacts and deals will be unlinked, then deletes it", async () => {
    const user = userEvent.setup();
    api({ "GET /organizations/1/delete-impact": { contacts: 4, deals: 1 }, "DELETE /organizations/1": null });
    renderApp("/organizations");

    await user.click(await screen.findByRole("button", { name: "Delete Northgate Realty" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Delete Northgate Realty?" });
    expect(await within(dialog).findByText("4 contacts and 1 deal will be unlinked.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Organization deleted")).toBeInTheDocument();
    expect(requests.some((r) => r.method === "DELETE" && r.path === "/organizations/1")).toBe(true);
  });

  it("tells the user when the server refuses the delete", async () => {
    const user = userEvent.setup();
    api({
      "GET /organizations/1/delete-impact": { contacts: 0, deals: 0 },
      "DELETE /organizations/1": new FakeResponse(404, null),
    });
    renderApp("/organizations");

    await user.click(await screen.findByRole("button", { name: "Delete Northgate Realty" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(await within(dialog).findByText("Nothing else will change.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("That record no longer exists.")).toBeInTheDocument();
  });

  it("keeps the organization when the user cancels", async () => {
    const user = userEvent.setup();
    api({ "GET /organizations/3/delete-impact": { contacts: 2, deals: 5 } });
    renderApp("/organizations");

    await user.click(await screen.findByRole("button", { name: "Delete Bayline Title & Escrow" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(await within(dialog).findByText("2 contacts and 5 deals will be unlinked.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(requests.some((r) => r.method === "DELETE")).toBe(false);
  });
});
