import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { Activity } from "../activities/types";
import { FollowUps } from "./FollowUps";

function followUp(id: number, description: string, follow_up_date: string): Activity {
  return {
    id,
    type: "call",
    contact_id: 1,
    contact_name: "Rachel Kim",
    deal_id: null,
    deal_name: null,
    description,
    occurred_at: "2026-11-20T15:00:00Z",
    follow_up_date,
    done: false,
    from_stage: null,
    to_stage: null,
    created_at: "2026-11-20T15:00:00Z",
    updated_at: "2026-11-20T15:00:00Z",
  };
}

describe("FollowUps", () => {
  it("names each Mark done button after its follow-up, so they can be told apart", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <FollowUps
            followUps={{
              overdue: [followUp(1, "Call Rachel about the inspection report", "2026-11-19")],
              this_week: [followUp(2, "Email the pre-approval letter", "2026-11-26")],
              later: [],
            }}
          />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect(
      screen.getByRole("button", { name: "Mark done: Call Rachel about the inspection report" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mark done: Email the pre-approval letter" })).toBeInTheDocument();
  });
});
