import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FakeResponse, mockApi, renderApp, requests } from "../../test/renderApp";
import type { Deal, Stage } from "../deals/types";
import type { ContactDetail } from "./types";

const stages: Stage[] = [
  { key: "new_lead", label: "New lead", probability: 10, open: true },
  { key: "offer", label: "Offer", probability: 60, open: true },
  { key: "closed_won", label: "Closed won", probability: 100, open: false },
];

function deal(id: number, name: string, fields: Partial<Deal> = {}): Deal {
  return {
    id,
    name,
    contact_id: 3,
    contact_name: "Lucy Chen",
    organization_id: null,
    organization_name: null,
    stage: "offer",
    value: 485000,
    probability: 60,
    expected_value: 291000,
    close_date: "2026-12-15",
    position: 0,
    notes: null,
    late: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...fields,
  };
}

function contactDetail(fields: Partial<ContactDetail> = {}): ContactDetail {
  return {
    id: 3,
    first_name: "Lucy",
    last_name: "Chen",
    name: "Lucy Chen",
    email: "lucy.chen@example.com",
    phone: "555-0101",
    job_title: "First-time buyer",
    organization_id: 7,
    organization_name: "Harbor Point Lending",
    organization: { id: 7, name: "Harbor Point Lending" },
    status: "customer",
    last_activity_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    deals: [deal(5, "12 Elm Street purchase")],
    timeline: [],
    ...fields,
  };
}

function details() {
  return within(screen.getByRole("region", { name: "Details" }));
}

describe("a contact's page", () => {
  it("shows the contact's details and deals", async () => {
    mockApi({ "GET /contacts/3": contactDetail(), "GET /stages": stages });
    renderApp("/contacts/3");

    expect(screen.getByRole("status")).toHaveTextContent("Loading contact...");
    expect(await screen.findByRole("heading", { name: "Lucy Chen", level: 1 })).toBeInTheDocument();
    expect(details().getByText("Customer")).toBeInTheDocument();
    expect(details().getByRole("link", { name: "Harbor Point Lending" })).toHaveAttribute("href", "/organizations/7");
    expect(details().getByRole("link", { name: "lucy.chen@example.com" })).toHaveAttribute(
      "href",
      "mailto:lucy.chen@example.com",
    );
    expect(details().getByText("555-0101")).toBeInTheDocument();

    const deals = within(screen.getByRole("region", { name: /Deals/ }));
    expect(deals.getByRole("link", { name: "12 Elm Street purchase" })).toHaveAttribute("href", "/deals/5");
    expect(deals.getByText("$485,000")).toBeInTheDocument();
    expect(await deals.findByText("Offer")).toBeInTheDocument();
    expect(screen.getByRole("main")).toHaveTextContent("First-time buyer");
  });

  it("says which details aren't set and when there are no deals", async () => {
    mockApi({
      "GET /contacts/3": contactDetail({
        email: null,
        phone: null,
        job_title: null,
        organization_id: null,
        organization_name: null,
        organization: null,
        deals: [],
      }),
    });
    renderApp("/contacts/3");

    await screen.findByRole("heading", { name: "Lucy Chen", level: 1 });
    expect(details().getByText("None")).toBeInTheDocument();
    expect(details().getAllByText("Not set")).toHaveLength(3);
    expect(screen.getByText("No deals with this contact yet.")).toBeInTheDocument();
  });

  it("shows the server's error, with a way back to the list and a retry", async () => {
    const user = userEvent.setup();
    let calls = 0;
    mockApi({
      "GET /contacts/3": () => (++calls === 1 ? new FakeResponse(404) : contactDetail({ deals: [] })),
    });
    renderApp("/contacts/3");

    expect(await screen.findByRole("alert")).toHaveTextContent("That record no longer exists.");
    expect(screen.getByRole("link", { name: "Back to contacts" })).toHaveAttribute("href", "/contacts");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("heading", { name: "Lucy Chen", level: 1 })).toBeInTheDocument();
  });

  it("edits the contact and shows the new details", async () => {
    const user = userEvent.setup();
    let saved = contactDetail({ deals: [] });
    mockApi({
      "GET /contacts/3": () => saved,
      "GET /organizations": [],
      "PATCH /contacts/3": (body: unknown) => {
        saved = { ...saved, ...(body as object), name: "Lucy Park" };
        return saved;
      },
    });
    renderApp("/contacts/3");

    await user.click(await screen.findByRole("button", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit contact" });
    expect(within(dialog).getByLabelText("First name")).toHaveValue("Lucy");
    await user.clear(within(dialog).getByLabelText("Last name"));
    await user.type(within(dialog).getByLabelText("Last name"), "Park");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("heading", { name: "Lucy Park", level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(requests.find((r) => r.method === "PATCH")?.body).toMatchObject({ last_name: "Park" });
  });

  it("deletes the contact and goes back to the list", async () => {
    const user = userEvent.setup();
    mockApi({
      "GET /contacts/3": contactDetail({ deals: [] }),
      "GET /contacts/3/delete-impact": { deals: 0, activities: 4 },
      "DELETE /contacts/3": null,
      "GET /contacts": [],
    });
    renderApp("/contacts/3");

    await user.click(await screen.findByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Delete Lucy Chen?" });
    expect(await within(dialog).findByText("4 activities will be deleted.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect(await screen.findByRole("heading", { name: "Contacts", level: 1 })).toBeInTheDocument();
    await waitFor(() => expect(requests).toContainEqual({ method: "DELETE", path: "/contacts/3", body: undefined }));
    expect(requests.filter((r) => r.path === "/contacts/3" && r.method === "GET")).toHaveLength(1);
  });
});
