import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { DataTable, type TableColumn } from "./DataTable";

type Deal = { id: number; name: string; stageOrder: number; stage: string; phone: string | null };

const deals: Deal[] = [
  { id: 1, name: "Birch Lane", stageOrder: 3, stage: "Offer", phone: "555-0101" },
  { id: 2, name: "Harbor Point", stageOrder: 1, stage: "New Lead", phone: null },
  { id: 3, name: "Cedar Court", stageOrder: 2, stage: "Qualified", phone: "555-0199" },
];

const columns: TableColumn<Deal>[] = [
  { id: "name", header: "Deal", value: (d) => d.name, search: true },
  // Sorted by the stage's place in the pipeline, but searched by its name.
  { id: "stage", header: "Stage", value: (d) => d.stageOrder, cell: (d) => d.stage, searchText: (d) => d.stage },
  { id: "phone", header: "Phone", value: (d) => d.phone, search: true, mono: true, nowrap: true },
];

function renderTable(rows = deals, extra: { filters?: React.ReactNode; emptyAction?: React.ReactNode } = {}) {
  render(
    <MemoryRouter>
      <DataTable
        rows={rows}
        columns={columns}
        searchLabel="Search deals"
        rowHref={(d) => `/deals/${d.id}`}
        rowLabel={(d) => d.name}
        emptyMessage="No deals yet."
        {...extra}
      />
    </MemoryRouter>,
  );
}

function names() {
  return screen
    .getAllByRole("row")
    .slice(1)
    .map((row) => within(row).getAllByRole("cell")[0].textContent);
}

describe("DataTable search and display", () => {
  it("searches a column by the text it shows, not the value it sorts by", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.type(screen.getByRole("searchbox", { name: "Search deals" }), "qualif");
    expect(names()).toEqual(["Cedar Court"]);

    await user.clear(screen.getByRole("searchbox", { name: "Search deals" }));
    await user.type(screen.getByRole("searchbox", { name: "Search deals" }), "3");
    expect(names()).toEqual([]);
  });

  it("sorts a column by its value while showing its text", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(within(screen.getByRole("columnheader", { name: "Stage" })).getByRole("button"));

    expect(names()).toEqual(["Harbor Point", "Cedar Court", "Birch Lane"]);
    expect(screen.getByRole("cell", { name: "New Lead" })).toBeInTheDocument();
  });

  it("matches blank values with nothing, and shows them empty", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.type(screen.getByRole("searchbox", { name: "Search deals" }), "555");

    expect(names()).toEqual(["Birch Lane", "Cedar Court"]);
    expect(screen.getByRole("cell", { name: "555-0101" })).toHaveClass("mono", "nowrap");
  });

  it("puts blank values last when sorting", async () => {
    const user = userEvent.setup();
    renderTable();

    await user.click(within(screen.getByRole("columnheader", { name: "Phone" })).getByRole("button"));

    expect(names()).toEqual(["Birch Lane", "Cedar Court", "Harbor Point"]);
  });

  it("shows the filters it's given, and the empty action when there are no rows", () => {
    renderTable([], {
      filters: <select aria-label="Status" />,
      emptyAction: <button type="button">New deal</button>,
    });

    expect(screen.getByRole("combobox", { name: "Status" })).toBeInTheDocument();
    expect(screen.getByText("No deals yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New deal" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("has no actions column without edit or delete", () => {
    renderTable();

    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: /Edit|Delete/ })).not.toBeInTheDocument();
  });
});
