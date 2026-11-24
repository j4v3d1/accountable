import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormDialog } from "./FormDialog";

describe("FormDialog", () => {
  it("has no description when none is given, so screen readers don't hear the title twice", () => {
    render(
      <FormDialog open onOpenChange={() => {}} title="New contact">
        <p>Form</p>
      </FormDialog>,
    );
    expect(screen.getByRole("dialog", { name: "New contact" })).not.toHaveAccessibleDescription();
  });

  it("describes the dialog with the description it's given", () => {
    render(
      <FormDialog open onOpenChange={() => {}} title="Log activity" description="On Wren Talbot">
        <p>Form</p>
      </FormDialog>,
    );
    expect(screen.getByRole("dialog", { name: "Log activity" })).toHaveAccessibleDescription("On Wren Talbot");
  });
});
