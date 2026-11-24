import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ActivityForm } from "./ActivityForm";

describe("ActivityForm", () => {
  it("needs a description", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ActivityForm onSubmit={onSubmit} onCancel={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText("Description")).toHaveAccessibleDescription("Describe what happened");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows Done only when there's a follow-up date", async () => {
    const user = userEvent.setup();
    render(<ActivityForm onSubmit={() => {}} onCancel={() => {}} />);
    expect(screen.queryByLabelText("Done")).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Follow-up date"), "2026-11-27");

    expect(screen.getByLabelText("Done")).not.toBeChecked();
  });

  it("sends the type, description, time in UTC and follow-up", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ActivityForm onSubmit={onSubmit} onCancel={() => {}} />);

    await user.click(screen.getByRole("radio", { name: "Call" }));
    await user.type(screen.getByLabelText("Description"), "Called about the counteroffer");
    await user.clear(screen.getByLabelText("When"));
    await user.type(screen.getByLabelText("When"), "2026-11-23T10:42");
    await user.type(screen.getByLabelText("Follow-up date"), "2026-11-27");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith({
      type: "call",
      description: "Called about the counteroffer",
      occurred_at: new Date(2026, 10, 23, 10, 42).toISOString(),
      follow_up_date: "2026-11-27",
      done: false,
    });
  });
});
