import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { queryClient } from "../../api/client";
import { FakeResponse, mockApi, requests } from "../../test/renderApp";
import { ToastProvider } from "../../ui/Toast";
import { FollowUps } from "../dashboard/FollowUps";
import type { Activity } from "./types";

const followUp: Activity = {
  id: 11,
  type: "call",
  contact_id: 3,
  contact_name: "Lucy Chen",
  deal_id: null,
  deal_name: null,
  description: "Call Lucy about the inspection report",
  occurred_at: "2026-11-20T15:00:00Z",
  follow_up_date: "2026-11-19",
  done: false,
  from_stage: null,
  to_stage: null,
  created_at: "2026-11-20T15:00:00Z",
  updated_at: "2026-11-20T15:00:00Z",
};

function renderFollowUps() {
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ToastProvider>
          <FollowUps followUps={{ overdue: [followUp], this_week: [], later: [] }} />
        </ToastProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("marking a follow-up done", () => {
  it("saves the activity as done and confirms it", async () => {
    const user = userEvent.setup();
    mockApi({ "PATCH /activities/11": { ...followUp, done: true } });
    renderFollowUps();

    await user.click(screen.getByRole("button", { name: "Mark done: Call Lucy about the inspection report" }));

    expect((await screen.findAllByText("Follow-up done")).length).toBeGreaterThan(0);
    expect(requests).toContainEqual({ method: "PATCH", path: "/activities/11", body: { done: true } });
  });

  it("tells you when it can't be saved", async () => {
    const user = userEvent.setup();
    mockApi({ "PATCH /activities/11": new FakeResponse(503) });
    renderFollowUps();

    await user.click(screen.getByRole("button", { name: "Mark done: Call Lucy about the inspection report" }));

    await waitFor(() =>
      expect(screen.getAllByText("Can't reach Accountable's server. Is it running?").length).toBeGreaterThan(0),
    );
    expect(screen.queryByText("Follow-up done")).not.toBeInTheDocument();
  });
});
