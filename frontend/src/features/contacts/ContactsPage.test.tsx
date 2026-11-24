import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { DataTable } from "../../ui/DataTable";
import { contactColumns } from "./ContactsPage";
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
    ...fields,
  };
}

function renderTable(rows: Contact[]) {
  render(
    <MemoryRouter>
      <DataTable
        rows={rows}
        columns={contactColumns}
        searchLabel="Search contacts"
        rowHref={(c) => `/contacts/${c.id}`}
        rowLabel={(c) => c.name}
        emptyMessage="No contacts yet."
      />
    </MemoryRouter>,
  );
}

describe("contacts table", () => {
  it("shows the last activity on the day it happened in local time", () => {
    // 11:30pm on Nov 23 locally is already Nov 24 in UTC anywhere west of UTC.
    renderTable([contact(1, "Lucy Chen", { last_activity_at: new Date(2026, 10, 23, 23, 30).toISOString() })]);

    expect(screen.getByText("Nov 23, 2026")).toBeInTheDocument();
  });

  it("finds contacts by their status in the search box (R2)", async () => {
    const user = userEvent.setup();
    renderTable([contact(1, "Lucy Chen", { status: "lead" }), contact(2, "Grace Liu", { status: "customer" })]);

    await user.type(screen.getByRole("searchbox", { name: "Search contacts" }), "custom");

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual(["Grace Liu"]);
  });
});
