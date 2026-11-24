import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmptyState, ErrorState, LoadingState } from "./States";

describe("LoadingState", () => {
  it("announces what is loading", () => {
    render(<LoadingState label="Loading contacts..." />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading contacts...");
  });
});

describe("ErrorState", () => {
  it("shows the message and offers to try again", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState message="Can't reach Accountable's server. Is it running?" onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Can't reach Accountable's server. Is it running?");
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("has no Try again button when there is nothing to retry", () => {
    render(<ErrorState message="Something went wrong. Please try again." />);

    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("shows the message and the action", () => {
    render(<EmptyState message="No contacts yet." action={<button type="button">New contact</button>} />);

    expect(screen.getByText("No contacts yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New contact" })).toBeInTheDocument();
  });
});
