import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { OrganizationForm } from "./OrganizationForm";

describe("OrganizationForm", () => {
  it("shows an error next to the name when it's missing", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<OrganizationForm onSubmit={onSubmit} onCancel={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText("Name")).toHaveAccessibleDescription("Enter a name");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("refuses a website that doesn't look valid", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<OrganizationForm onSubmit={onSubmit} onCancel={() => {}} />);

    await user.type(screen.getByLabelText("Name"), "Harbor Point Lending");
    await user.type(screen.getByLabelText("Website"), "not a website");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText("Website")).toHaveAccessibleDescription("Enter a valid website, such as example.com");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("sends trimmed values, with blank fields as empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<OrganizationForm onSubmit={onSubmit} onCancel={() => {}} />);

    await user.type(screen.getByLabelText("Name"), "  Harbor Point Lending ");
    await user.type(screen.getByLabelText("Website"), "harborpoint.example.com");
    await user.selectOptions(screen.getByLabelText("Industry"), "Mortgage lending");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Harbor Point Lending",
      website: "harborpoint.example.com",
      industry: "Mortgage lending",
      notes: null,
    });
  });

  it("starts from the current values when editing", () => {
    render(
      <OrganizationForm
        initial={{ name: "Bayline Title & Escrow", website: null, industry: "Other", notes: "Our escrow company" }}
        onSubmit={() => {}}
        onCancel={() => {}}
      />,
    );

    expect(screen.getByLabelText("Name")).toHaveValue("Bayline Title & Escrow");
    expect(screen.getByLabelText("Industry")).toHaveValue("Other");
    expect(screen.getByLabelText("Notes")).toHaveValue("Our escrow company");
  });
});
