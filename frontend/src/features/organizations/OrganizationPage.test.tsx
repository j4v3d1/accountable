import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Contact } from "../contacts/types";
import type { Deal, Stage } from "../deals/types";
import { FakeResponse, mockApi, renderApp, requests } from "../../test/renderApp";
import type { OrganizationDetail } from "./types";

const stages: Stage[] = [
  { key: "new_lead", label: "New Lead", probability: 10, open: true },
  { key: "offer", label: "Offer", probability: 60, open: true },
];

function contact(overrides: Partial<Contact> & Pick<Contact, "id" | "first_name" | "last_name">): Contact {
  return {
    name: `${overrides.first_name} ${overrides.last_name}`,
    email: null,
    phone: null,
    job_title: null,
    organization_id: 1,
    organization_name: "Northgate Realty",
    status: "lead",
    last_activity_at: null,
    created_at: "2026-10-01T09:00:00Z",
    updated_at: "2026-10-01T09:00:00Z",
    ...overrides,
  };
}

function deal(overrides: Partial<Deal> & Pick<Deal, "id" | "name">): Deal {
  return {
    contact_id: null,
    contact_name: null,
    organization_id: 1,
    organization_name: "Northgate Realty",
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
    ...overrides,
  };
}

const northgate: OrganizationDetail = {
  id: 1,
  name: "Northgate Realty",
  website: "northgaterealty.example.com",
  industry: "Brokerage",
  notes: "Refers most of our buyers.",
  contact_count: 3,
  open_deal_count: 2,
  created_at: "2026-10-01T09:00:00Z",
  updated_at: "2026-10-01T09:00:00Z",
  contacts: [
    contact({ id: 4, first_name: "Dana", last_name: "Whitfield", job_title: "Broker", status: "customer" }),
    contact({ id: 5, first_name: "Luis", last_name: "Ortega", email: "luis@northgate.example.com" }),
    contact({ id: 6, first_name: "Priya", last_name: "Raman", status: "qualified" }),
  ],
  deals: [
    deal({ id: 3, name: "142 Maple Ave purchase", stage: "offer", value: 585000, contact_name: "Dana Whitfield" }),
    deal({ id: 7, name: "88 Birchwood Ct listing", value: 320000 }),
  ],
};

const empty: OrganizationDetail = {
  ...northgate,
  website: null,
  industry: null,
  notes: null,
  contacts: [],
  deals: [],
};

function api(routes: Record<string, unknown> = {}) {
  mockApi({ "GET /organizations/1": northgate, "GET /stages": stages, ...routes });
}

function section(name: RegExp | string) {
  return within(screen.getByRole("region", { name }));
}

describe("an organization's page", () => {
  it("says it's loading, then shows the organization's details", async () => {
    api();
    renderApp("/organizations/1");

    expect(screen.getByText("Loading organization...")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Northgate Realty" })).toBeInTheDocument();
    const details = section("Details");
    expect(details.getByText("Brokerage")).toBeInTheDocument();
    const website = details.getByRole("link", { name: "northgaterealty.example.com" });
    expect(website).toHaveAttribute("href", "https://northgaterealty.example.com");
    expect(website).toHaveAttribute("target", "_blank");
    expect(details.getByText("Refers most of our buyers.")).toBeInTheDocument();
  });

  it("lists its contacts with their job title or email and status", async () => {
    api();
    renderApp("/organizations/1");

    await screen.findByRole("heading", { name: "Northgate Realty" });
    const contacts = section(/Contacts/);
    expect(contacts.getByText("3")).toBeInTheDocument();
    const items = contacts.getAllByRole("listitem");
    expect(within(items[0]).getByRole("link", { name: "Dana Whitfield" })).toHaveAttribute("href", "/contacts/4");
    expect(within(items[0]).getByText("Broker")).toBeInTheDocument();
    expect(within(items[0]).getByText("Customer")).toBeInTheDocument();
    expect(within(items[1]).getByText("luis@northgate.example.com")).toBeInTheDocument();
    expect(within(items[1]).getByText("Lead")).toBeInTheDocument();
    expect(within(items[2]).getByText("Qualified")).toBeInTheDocument();
  });

  it("lists its deals with their value and stage", async () => {
    api();
    renderApp("/organizations/1");

    await screen.findByRole("heading", { name: "Northgate Realty" });
    const deals = section(/Deals/);
    expect(deals.getByText("2")).toBeInTheDocument();
    const items = deals.getAllByRole("listitem");
    expect(within(items[0]).getByRole("link", { name: "142 Maple Ave purchase" })).toHaveAttribute("href", "/deals/3");
    expect(within(items[0]).getByText("Dana Whitfield")).toBeInTheDocument();
    expect(within(items[0]).getByText("$585,000")).toBeInTheDocument();
    expect(await within(items[0]).findByText("Offer")).toBeInTheDocument();
    expect(within(items[1]).getByText("$320,000")).toBeInTheDocument();
    expect(within(items[1]).getByText("New Lead")).toBeInTheDocument();
  });

  it("says what isn't set yet on a new organization", async () => {
    api({ "GET /organizations/1": empty });
    renderApp("/organizations/1");

    await screen.findByRole("heading", { name: "Northgate Realty" });
    expect(section("Details").getAllByText("Not set")).toHaveLength(2);
    expect(section("Details").getByText("No notes")).toBeInTheDocument();
    expect(screen.getByText("No contacts at this organization yet.")).toBeInTheDocument();
    expect(screen.getByText("No deals with this organization yet.")).toBeInTheDocument();
  });

  it("says when the organization doesn't exist, with a way back to the list", async () => {
    api({ "GET /organizations/1": new FakeResponse(404, null) });
    renderApp("/organizations/1");

    expect(await screen.findByRole("alert")).toHaveTextContent("That record no longer exists.");
    expect(screen.getByRole("link", { name: "Back to organizations" })).toHaveAttribute("href", "/organizations");
  });

  it("tries loading again after an error", async () => {
    const user = userEvent.setup();
    let calls = 0;
    api({ "GET /organizations/1": () => (++calls === 1 ? new FakeResponse(500) : northgate) });
    renderApp("/organizations/1");

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("heading", { name: "Northgate Realty" })).toBeInTheDocument();
  });

  it("edits the organization and shows the saved details", async () => {
    const user = userEvent.setup();
    let current = northgate;
    api({
      "GET /organizations/1": () => current,
      "PATCH /organizations/1": (body: unknown) => {
        current = { ...northgate, ...(body as object) };
        return current;
      },
    });
    renderApp("/organizations/1");

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit organization" });
    expect(within(dialog).getByLabelText("Website")).toHaveValue("northgaterealty.example.com");
    await user.selectOptions(within(dialog).getByLabelText("Industry"), "Relocation");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await section("Details").findByText("Relocation")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Organization saved")).toBeInTheDocument();
  });

  it("deletes the organization and goes back to the organizations list", async () => {
    const user = userEvent.setup();
    api({
      "GET /organizations/1/delete-impact": { contacts: 3, deals: 2 },
      "DELETE /organizations/1": null,
      "GET /organizations": [],
    });
    renderApp("/organizations/1");

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Delete Northgate Realty?" });
    expect(await within(dialog).findByText("3 contacts and 2 deals will be unlinked.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("heading", { name: "Organizations" })).toBeInTheDocument();
    expect(await screen.findByText("Organization deleted")).toBeInTheDocument();
    const afterDelete = requests.slice(requests.findIndex((r) => r.method === "DELETE"));
    expect(afterDelete.some((r) => r.method === "GET" && r.path === "/organizations/1")).toBe(false);
  });

  it("lets the user try again when the delete counts can't load", async () => {
    const user = userEvent.setup();
    let calls = 0;
    api({
      "GET /organizations/1/delete-impact": () => (++calls === 1 ? new FakeResponse(502) : { contacts: 1, deals: 0 }),
    });
    renderApp("/organizations/1");

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(await within(dialog).findByText(/Couldn't check linked records/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Delete" })).toBeDisabled();
    await user.click(within(dialog).getByRole("button", { name: "Try again" }));

    expect(await within(dialog).findByText("1 contact will be unlinked.")).toBeInTheDocument();
  });
});
