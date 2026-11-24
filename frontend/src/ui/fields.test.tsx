import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FormActions } from "./FormDialog";
import { SelectField, TextAreaField, TextField } from "./fields";

describe("TextField", () => {
  it("labels the input and passes typing through", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TextField label="Name" onChange={onChange} />);

    await user.type(screen.getByRole("textbox", { name: "Name" }), "Lucy");

    expect(onChange).toHaveBeenCalledTimes(4);
  });

  it("shows its error under the input and ties it to the input", () => {
    render(<TextField label="Email" error="Enter a valid email" className="wide" fieldClassName="span-2" />);

    const input = screen.getByRole("textbox", { name: "Email" });
    expect(input).toBeInvalid();
    expect(input).toHaveAccessibleDescription("Enter a valid email");
    expect(input).toHaveClass("input", "wide");
  });

  it("is valid with no error, and keeps an id it's given", () => {
    render(<TextField label="Phone" id="phone" />);

    const input = screen.getByRole("textbox", { name: "Phone" });
    expect(input).toHaveAttribute("id", "phone");
    expect(input).not.toBeInvalid();
    expect(screen.queryByText(/Enter/)).not.toBeInTheDocument();
  });
});

describe("SelectField", () => {
  it("labels the select, lets you choose, and shows its error", async () => {
    const user = userEvent.setup();
    render(
      <SelectField label="Stage" error="Choose a stage" defaultValue="">
        <option value="">Choose</option>
        <option value="offer">Offer</option>
      </SelectField>,
    );

    const select = screen.getByRole("combobox", { name: "Stage" });
    await user.selectOptions(select, "Offer");

    expect(select).toHaveValue("offer");
    expect(select).toHaveAccessibleDescription("Choose a stage");
  });

  it("keeps an id it's given", () => {
    render(
      <SelectField label="Type" id="type">
        <option value="call">Call</option>
      </SelectField>,
    );

    expect(screen.getByRole("combobox", { name: "Type" })).toHaveAttribute("id", "type");
  });
});

describe("TextAreaField", () => {
  it("labels the text area and shows its error", () => {
    render(<TextAreaField label="Notes" error="Notes are too long" />);

    const area = screen.getByRole("textbox", { name: "Notes" });
    expect(area.tagName).toBe("TEXTAREA");
    expect(area).toHaveAccessibleDescription("Notes are too long");
  });

  it("keeps an id it's given", () => {
    render(<TextAreaField label="Description" id="description" />);

    expect(screen.getByRole("textbox", { name: "Description" })).toHaveAttribute("id", "description");
  });
});

describe("FormActions", () => {
  it("cancels, and saves by submitting the form", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <FormActions onCancel={onCancel} />
      </form>,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("says it's saving, and can't be pressed again, while the save is pending", () => {
    render(<FormActions onCancel={() => {}} pending />);

    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
  });
});
