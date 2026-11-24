import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ToastProvider, useToast } from "./Toast";

function Notifier() {
  const notify = useToast();
  return (
    <>
      <button type="button" onClick={() => notify("Deal saved")}>
        Save
      </button>
      <button type="button" onClick={() => notify("That record no longer exists.", "error")}>
        Fail
      </button>
    </>
  );
}

describe("Toast", () => {
  it("shows a confirmation, which can be dismissed", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Notifier />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByText("Deal saved")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Deal saved")).not.toBeInTheDocument();
  });

  it("shows an error as an error", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Notifier />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Fail" }));

    expect(screen.getByText("That record no longer exists.").closest(".toast")).toHaveClass("toast-error");
  });

  it("stacks several messages", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Notifier />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Fail" }));

    expect(screen.getByText("Deal saved")).toBeInTheDocument();
    expect(screen.getByText("That record no longer exists.")).toBeInTheDocument();
  });

  it("does nothing outside a provider", async () => {
    const user = userEvent.setup();
    render(<Notifier />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.queryByText("Deal saved")).not.toBeInTheDocument();
  });
});
