import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { Deal, Stage } from "../deals/types";
import { Board } from "./PipelineBoard";

const stages: Stage[] = [
  { key: "new_lead", label: "New Lead", probability: 10, open: true },
  { key: "qualified", label: "Qualified", probability: 20, open: true },
  { key: "closed_won", label: "Closed (Won)", probability: 100, open: false },
];

function renderBoard(deals: Deal[] = []) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <Board deals={deals} stages={stages} onAdd={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Board", () => {
  it("names each column's Add deal button after its stage, so they can be told apart", () => {
    renderBoard();
    expect(screen.getByRole("button", { name: "Add deal to New Lead" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add deal to Qualified" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add deal to Closed (Won)" })).toBeInTheDocument();
  });

  it("shows the probability on every card, closed deals included (R20)", () => {
    renderBoard([
      {
        id: 1,
        name: "33 Laurel St sale",
        contact_id: null,
        contact_name: "Paula Svensson",
        organization_id: null,
        organization_name: null,
        stage: "closed_won",
        value: 612000,
        probability: 100,
        expected_value: 612000,
        close_date: "2026-11-12",
        position: 0,
        notes: null,
        late: false,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        created_by_name: "Sample data",
        updated_by_name: "Sample data",
      },
    ]);

    const column = screen.getByRole("region", { name: "Closed (Won) column" });
    expect(within(column).getByText("100%")).toBeInTheDocument();
    expect(within(column).getByRole("img", { name: "100% probability" })).toBeInTheDocument();
  });
});
