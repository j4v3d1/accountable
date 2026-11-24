import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { Stage } from "../deals/types";
import { Board } from "./PipelineBoard";

const stages: Stage[] = [
  { key: "new_lead", label: "New Lead", probability: 10, open: true },
  { key: "qualified", label: "Qualified", probability: 20, open: true },
  { key: "closed_won", label: "Closed (Won)", probability: 100, open: false },
];

describe("Board", () => {
  it("names each column's Add deal button after its stage, so they can be told apart", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <Board deals={[]} stages={stages} onAdd={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(screen.getByRole("button", { name: "Add deal to New Lead" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add deal to Qualified" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add deal to Closed (Won)" })).toBeInTheDocument();
  });
});
