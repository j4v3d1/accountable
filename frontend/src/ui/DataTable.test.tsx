import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useParams } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { DataTable, type TableColumn } from "./DataTable";

type Row = { id: number; name: string; city: string; value: number };

const rows: Row[] = [
  { id: 1, name: "Birchwood", city: "Northgate", value: 300 },
  { id: 2, name: "Ashford", city: "Keystone", value: 100 },
  { id: 3, name: "Cedar", city: "Harbor Point", value: 200 },
];

const columns: TableColumn<Row>[] = [
  { id: "name", header: "Name", value: (r) => r.name, search: true },
  { id: "city", header: "City", value: (r) => r.city, search: true },
  { id: "value", header: "Value (USD)", value: (r) => r.value, cell: (r) => `$${r.value}`, align: "right" },
];

function Opened() {
  return <p>Opened {useParams().id}</p>;
}

function renderTable(props: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) {
  render(
    <MemoryRouter>
      <Routes>
        <Route
          path="/"
          element={
            <DataTable
              rows={rows}
              columns={columns}
              searchLabel="Search places"
              rowHref={(r) => `/places/${r.id}`}
              rowLabel={(r) => r.name}
              emptyMessage="No places yet."
              {...props}
            />
          }
        />
        <Route path="/places/:id" element={<Opened />} />
      </Routes>
    </MemoryRouter>,
  );
}

function names() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent);
}

describe("DataTable", () => {
  it("filters rows as you type, matching any text column", async () => {
    const user = userEvent.setup();
    renderTable();
    const search = screen.getByRole("searchbox", { name: "Search places" });

    await user.type(search, "harbor");
    expect(names()).toEqual(["Cedar"]);

    await user.clear(search);
    await user.type(search, "KEY");
    expect(names()).toEqual(["Ashford"]);
  });

  it("says when the search matches nothing", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.type(screen.getByRole("searchbox", { name: "Search places" }), "zzz");

    expect(screen.getByText(/No matches for/)).toBeInTheDocument();
  });

  it("sorts ascending, then descending, then back to the default order", async () => {
    const user = userEvent.setup();
    renderTable();
    const heading = screen.getByRole("columnheader", { name: "Name" });
    const button = within(heading).getByRole("button");

    expect(names()).toEqual(["Birchwood", "Ashford", "Cedar"]);
    await user.click(button);
    expect(names()).toEqual(["Ashford", "Birchwood", "Cedar"]);
    expect(heading).toHaveAttribute("aria-sort", "ascending");
    await user.click(button);
    expect(names()).toEqual(["Cedar", "Birchwood", "Ashford"]);
    expect(heading).toHaveAttribute("aria-sort", "descending");
    await user.click(button);
    expect(names()).toEqual(["Birchwood", "Ashford", "Cedar"]);
    expect(heading).not.toHaveAttribute("aria-sort");
  });

  it("sorts numbers by value, smallest first", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(within(screen.getByRole("columnheader", { name: "Value (USD)" })).getByRole("button"));

    expect(names()).toEqual(["Ashford", "Cedar", "Birchwood"]);
  });

  it("has edit and delete on each row, without opening the row", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    renderTable({ onEdit, onDelete });

    await user.click(screen.getByRole("button", { name: "Edit Ashford" }));
    await user.click(screen.getByRole("button", { name: "Delete Cedar" }));

    expect(onEdit).toHaveBeenCalledWith(rows[1]);
    expect(onDelete).toHaveBeenCalledWith(rows[2]);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("opens the record's page when a row is clicked", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(screen.getByRole("cell", { name: "Keystone" }));

    expect(screen.getByText("Opened 2")).toBeInTheDocument();
  });

  it("shows the empty message when there are no rows", () => {
    renderTable({ rows: [] });

    expect(screen.getByText("No places yet.")).toBeInTheDocument();
  });
});
