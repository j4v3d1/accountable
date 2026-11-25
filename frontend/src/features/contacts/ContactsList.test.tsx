import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { FakeResponse, mockApi, renderApp, requests } from "../../test/renderApp";
import type { Organization } from "../organizations/types";
import type { Contact } from "./types";

function contact(id: number, name: string, fields: Partial<Contact> = {}): Contact {
  const [first_name, last_name] = name.split(" ");
  return {
    id,
    first_name,
    last_name,
    name,
    email: null,
    phone: null,
    job_title: null,
    organization_id: null,
    organization_name: null,
    status: "lead",
    last_activity_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    created_by_name: "Sample data",
    updated_by_name: "Sample data",
    ...fields,
  };
}

function organization(id: number, name: string): Organization {
  return {
    id,
    name,
    website: null,
    industry: "Mortgage lending",
    notes: null,
    contact_count: 1,
    open_deal_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    created_by_name: "Sample data",
    updated_by_name: "Sample data",
  };
}

const lucy = contact(3, "Lucy Chen", {
  email: "lucy.chen@example.com",
  phone: "555-0101",
  job_title: "Buyer",
  organization_id: 7,
  organization_name: "Harbor Point Lending",
  status: "qualified",
});
const grace = contact(4, "Grace Liu", { status: "customer" });
const organizations = [organization(7, "Harbor Point Lending")];

function rowNames() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent);
}

describe("the contacts list", () => {
  it("lists every contact with its details and a count", async () => {
    mockApi({ "GET /contacts": [lucy, grace] });
    renderApp("/contacts");

    expect(screen.getByRole("status")).toHaveTextContent("Loading contacts...");
    expect(await screen.findByRole("link", { name: "Lucy Chen" })).toHaveAttribute("href", "/contacts/3");
    expect(screen.getByText("2 contacts")).toBeInTheDocument();
    const lucyRow = screen.getByRole("link", { name: "Lucy Chen" }).closest("tr")!;
    expect(within(lucyRow).getByText("Qualified")).toBeInTheDocument();
    expect(within(lucyRow).getByText("Harbor Point Lending")).toBeInTheDocument();
    expect(within(lucyRow).getByText("lucy.chen@example.com")).toBeInTheDocument();
    expect(within(lucyRow).getByText("555-0101")).toBeInTheDocument();
    expect(within(lucyRow).getByText("None yet")).toBeInTheDocument();
  });

  it("filters by status, and says when no contact has that status", async () => {
    const user = userEvent.setup();
    mockApi({ "GET /contacts": [lucy, grace] });
    renderApp("/contacts");
    await screen.findByRole("link", { name: "Lucy Chen" });

    await user.click(screen.getByRole("radio", { name: "Customer" }));
    expect(rowNames()).toEqual(["Grace Liu"]);

    await user.click(screen.getByRole("radio", { name: "Lead" }));
    expect(screen.getByText("No contacts with the Lead status.")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "All" }));
    expect(rowNames()).toEqual(["Lucy Chen", "Grace Liu"]);
  });

  it("invites you to add the first contact when there are none", async () => {
    mockApi({ "GET /contacts": [], "GET /organizations": [] });
    const user = userEvent.setup();
    renderApp("/contacts");

    expect(await screen.findByText("No contacts yet. Add your first lead to start.")).toBeInTheDocument();
    expect(screen.getByText("0 contacts")).toBeInTheDocument();

    const buttons = screen.getAllByRole("button", { name: "New contact" });
    await user.click(buttons[buttons.length - 1]);
    expect(await screen.findByRole("dialog", { name: "New contact" })).toBeInTheDocument();
  });

  it("shows an error when the contacts can't be loaded, and loads them again on Try again", async () => {
    const user = userEvent.setup();
    let calls = 0;
    mockApi({
      "GET /contacts": () => (++calls === 1 ? new FakeResponse(500, { detail: "Database is locked" }) : [lucy]),
    });
    renderApp("/contacts");

    expect(await screen.findByRole("alert")).toHaveTextContent("Database is locked");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("link", { name: "Lucy Chen" })).toBeInTheDocument();
  });

  it("adds a new contact and closes the form", async () => {
    const user = userEvent.setup();
    mockApi({
      "GET /contacts": [lucy],
      "GET /organizations": organizations,
      "POST /contacts": (body: unknown) => ({ ...contact(9, "Maria Lopez"), ...(body as object) }),
    });
    renderApp("/contacts");
    await screen.findByRole("link", { name: "Lucy Chen" });

    await user.click(screen.getByRole("button", { name: "New contact" }));
    const dialog = await screen.findByRole("dialog", { name: "New contact" });
    await user.type(within(dialog).getByLabelText("First name"), "Maria");
    await user.type(within(dialog).getByLabelText("Last name"), "Lopez");
    await user.type(within(dialog).getByLabelText("Phone"), "555-0199");
    await user.selectOptions(within(dialog).getByLabelText("Status"), "customer");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect((await screen.findAllByText("Contact saved")).length).toBeGreaterThan(0);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(requests.find((r) => r.method === "POST")?.body).toEqual({
      first_name: "Maria",
      last_name: "Lopez",
      email: null,
      phone: "555-0199",
      job_title: null,
      organization_id: null,
      status: "customer",
    });
  });

  it("edits a contact from its row, starting from the saved details", async () => {
    const user = userEvent.setup();
    mockApi({
      "GET /contacts": [lucy],
      "GET /organizations": organizations,
      "PATCH /contacts/3": (body: unknown) => ({ ...lucy, ...(body as object) }),
    });
    renderApp("/contacts");

    await user.click(await screen.findByRole("button", { name: "Edit Lucy Chen" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit contact" });
    expect(within(dialog).getByLabelText("Email")).toHaveValue("lucy.chen@example.com");
    expect(await within(dialog).findByText("Harbor Point Lending")).toBeInTheDocument();
    await user.clear(within(dialog).getByLabelText("Job title"));
    await user.type(within(dialog).getByLabelText("Job title"), "Investor");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(requests.find((r) => r.method === "PATCH")?.body).toEqual({
      first_name: "Lucy",
      last_name: "Chen",
      email: "lucy.chen@example.com",
      phone: "555-0101",
      job_title: "Investor",
      organization_id: 7,
      status: "qualified",
    });
  });

  it("edits a contact with no email, phone or job title, keeping them empty", async () => {
    const user = userEvent.setup();
    mockApi({
      "GET /contacts": [grace],
      "GET /organizations": organizations,
      "PATCH /contacts/4": (body: unknown) => ({ ...grace, ...(body as object) }),
    });
    renderApp("/contacts");

    await user.click(await screen.findByRole("button", { name: "Edit Grace Liu" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit contact" });
    expect(within(dialog).getByLabelText("Email")).toHaveValue("");
    expect(within(dialog).getByLabelText("Status")).toHaveValue("customer");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(requests.find((r) => r.method === "PATCH")?.body).toEqual({
      first_name: "Grace",
      last_name: "Liu",
      email: null,
      phone: null,
      job_title: null,
      organization_id: null,
      status: "customer",
    });
  });

  it("shows a status it doesn't recognise as the server sent it", async () => {
    mockApi({ "GET /contacts": [contact(5, "Omar Haddad", { status: "partner" as Contact["status"] })] });
    renderApp("/contacts");

    const row = (await screen.findByRole("link", { name: "Omar Haddad" })).closest("tr")!;
    expect(within(row).getByText("partner")).toBeInTheDocument();
  });

  it("keeps the form open and shows the server's reason when saving fails", async () => {
    const user = userEvent.setup();
    mockApi({
      "GET /contacts": [lucy],
      "GET /organizations": organizations,
      "PATCH /contacts/3": new FakeResponse(409, { detail: "A contact with that email already exists" }),
    });
    renderApp("/contacts");

    await user.click(await screen.findByRole("button", { name: "Edit Lucy Chen" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit contact" });
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect((await screen.findAllByText("A contact with that email already exists")).length).toBeGreaterThan(0);
    expect(screen.getByRole("dialog", { name: "Edit contact" })).toBeInTheDocument();
  });

  it("closes the form on Cancel without saving", async () => {
    const user = userEvent.setup();
    mockApi({ "GET /contacts": [lucy], "GET /organizations": organizations });
    renderApp("/contacts");

    await user.click(await screen.findByRole("button", { name: "Edit Lucy Chen" }));
    const dialog = await screen.findByRole("dialog", { name: "Edit contact" });
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(requests.some((r) => r.method !== "GET")).toBe(false);
  });

  it("deletes a contact after showing what else will change", async () => {
    const user = userEvent.setup();
    mockApi({
      "GET /contacts": [lucy, grace],
      "GET /contacts/3/delete-impact": { deals: 2, activities: 1 },
      "DELETE /contacts/3": null,
    });
    renderApp("/contacts");

    await user.click(await screen.findByRole("button", { name: "Delete Lucy Chen" }));
    const dialog = await screen.findByRole("alertdialog", { name: "Delete Lucy Chen?" });
    expect(
      await within(dialog).findByText("2 deals will be unlinked, 1 activity will be deleted."),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect((await screen.findAllByText("Contact deleted")).length).toBeGreaterThan(0);
    expect(requests).toContainEqual({ method: "DELETE", path: "/contacts/3", body: undefined });
  });

  it("tells you when a delete fails", async () => {
    const user = userEvent.setup();
    mockApi({
      "GET /contacts": [lucy],
      "GET /contacts/3/delete-impact": { deals: 0, activities: 0 },
      "DELETE /contacts/3": new FakeResponse(404),
    });
    renderApp("/contacts");

    await user.click(await screen.findByRole("button", { name: "Delete Lucy Chen" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(await within(dialog).findByText("Nothing else will change.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    expect((await screen.findAllByText("That record no longer exists.")).length).toBeGreaterThan(0);
  });

  it("lets you retry when the delete counts can't be loaded", async () => {
    const user = userEvent.setup();
    let calls = 0;
    mockApi({
      "GET /contacts": [lucy],
      "GET /contacts/3/delete-impact": () =>
        ++calls === 1 ? new FakeResponse(500, { detail: "Timed out" }) : { deals: 1, activities: 0 },
    });
    renderApp("/contacts");

    await user.click(await screen.findByRole("button", { name: "Delete Lucy Chen" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(await within(dialog).findByText("Couldn't check linked records. Timed out")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Try again" }));

    expect(await within(dialog).findByText("1 deal will be unlinked.")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
