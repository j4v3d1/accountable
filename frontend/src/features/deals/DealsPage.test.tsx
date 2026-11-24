import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { DataTable } from "../../ui/DataTable";
import { dealColumns } from "./DealsPage";
import type { Deal, Stage } from "./types";

const stages: Stage[] = [
  { key: "new_lead", label: "New Lead", probability: 10, open: true },
  { key: "offer", label: "Offer", probability: 60, open: true },
];

function deal(id: number, name: string, stage: Deal["stage"]): Deal {
  return {
    id,
    name,
    contact_id: null,
    contact_name: null,
    organization_id: null,
    organization_name: null,
    stage,
    value: 500000,
    probability: 10,
    expected_value: 50000,
    close_date: "2026-12-01",
    position: 0,
    notes: null,
    late: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

describe("deals table", () => {
  it("finds deals by their stage in the search box (R2)", async () => {
    const user = userEvent.setup();
    const client = new QueryClient();
    client.setQueryData(["stages"], stages);
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <DataTable
            rows={[deal(1, "88 Birchwood Ct purchase", "new_lead"), deal(2, "142 Maple Ave purchase", "offer")]}
            columns={dealColumns(stages)}
            searchLabel="Search deals"
            rowHref={(d) => `/deals/${d.id}`}
            rowLabel={(d) => d.name}
            emptyMessage="No deals yet."
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.type(screen.getByRole("searchbox", { name: "Search deals" }), "offer");

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows.map((row) => within(row).getAllByRole("cell")[0].textContent)).toEqual(["142 Maple Ave purchase"]);
  });
});
