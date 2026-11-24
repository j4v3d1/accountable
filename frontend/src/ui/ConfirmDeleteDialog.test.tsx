import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDeleteDialog, describeImpact } from "./ConfirmDeleteDialog";

describe("describeImpact", () => {
  it("joins counts that share an outcome", () => {
    expect(
      describeImpact([
        { count: 3, noun: "contact", outcome: "unlinked" },
        { count: 2, noun: "deal", outcome: "unlinked" },
      ]),
    ).toBe("3 contacts and 2 deals will be unlinked.");
  });

  it("lists each outcome in turn", () => {
    expect(
      describeImpact([
        { count: 2, noun: "deal", outcome: "unlinked" },
        { count: 5, noun: "activity", plural: "activities", outcome: "deleted" },
      ]),
    ).toBe("2 deals will be unlinked, 5 activities will be deleted.");
  });

  it("leaves out zero counts and uses the singular for one", () => {
    expect(
      describeImpact([
        { count: 0, noun: "deal", outcome: "unlinked" },
        { count: 1, noun: "activity", plural: "activities", outcome: "deleted" },
      ]),
    ).toBe("1 activity will be deleted.");
  });

  it("says nothing else changes when every count is zero", () => {
    expect(describeImpact([{ count: 0, noun: "deal", outcome: "unlinked" }])).toBe("Nothing else will change.");
  });
});

describe("ConfirmDeleteDialog", () => {
  it("names the record and shows the counts, leaving out zero counts", () => {
    render(
      <ConfirmDeleteDialog
        open
        onOpenChange={() => {}}
        recordName="Lucy Chen"
        impact={[
          { count: 2, noun: "deal", outcome: "unlinked" },
          { count: 0, noun: "activity", plural: "activities", outcome: "deleted" },
        ]}
        onConfirm={() => {}}
      />,
    );

    expect(screen.getByRole("alertdialog", { name: "Delete Lucy Chen?" })).toBeInTheDocument();
    expect(screen.getByText("2 deals will be unlinked.")).toBeInTheDocument();
    expect(screen.queryByText(/activit/)).not.toBeInTheDocument();
  });

  it("deletes only when confirmed", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <ConfirmDeleteDialog open onOpenChange={onOpenChange} recordName="Lucy Chen" impact={[]} onConfirm={onConfirm} />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("waits for the counts before allowing the delete", () => {
    render(
      <ConfirmDeleteDialog
        open
        onOpenChange={() => {}}
        recordName="Lucy Chen"
        impact={undefined}
        onConfirm={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
    expect(screen.getByText(/Checking linked records/)).toBeInTheDocument();
  });
});

describe("ConfirmDeleteDialog when the counts can't be loaded", () => {
  it("says so, keeps Delete disabled and offers to try again", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <ConfirmDeleteDialog
        open
        onOpenChange={() => {}}
        recordName="Lucy Chen"
        impact={undefined}
        impactError="Can't reach Accountable's server. Is it running?"
        onRetry={onRetry}
        onConfirm={() => {}}
      />,
    );

    expect(screen.getByText(/Couldn't check linked records/)).toBeInTheDocument();
    expect(screen.getByText(/Can't reach Accountable's server/)).toBeInTheDocument();
    expect(screen.queryByText(/Checking linked records/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
