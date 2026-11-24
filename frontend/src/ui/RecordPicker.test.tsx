import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { RecordPicker, type PickerOption } from "./RecordPicker";

const contacts: PickerOption[] = [
  { id: 1, label: "Priya Nair", hint: "Northgate Realty Partners" },
  { id: 2, label: "Omar Haddad", hint: null },
  { id: 3, label: "Lucy Chen" },
];

function Picker({ initial = null, onChange }: { initial?: number | null; onChange?: (id: number | null) => void }) {
  const [value, setValue] = useState<number | null>(initial);
  return (
    <RecordPicker
      label="Contact"
      value={value}
      onChange={(id) => {
        setValue(id);
        onChange?.(id);
      }}
      options={contacts}
    />
  );
}

describe("RecordPicker", () => {
  it("shows None until a record is chosen", () => {
    render(<Picker />);

    expect(screen.getByRole("button", { name: "Contact" })).toHaveTextContent("None");
  });

  it("lists the records with their hints, and chooses one", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Picker onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Contact" }));
    expect(screen.getByRole("option", { name: /Priya Nair/ })).toHaveTextContent(
      "Priya Nair · Northgate Realty Partners",
    );
    await user.click(screen.getByRole("option", { name: "Omar Haddad" }));

    expect(onChange).toHaveBeenCalledWith(2);
    expect(screen.getByRole("button", { name: "Contact" })).toHaveTextContent("Omar Haddad");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("narrows the list as you type, and says when nothing matches", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    await user.click(screen.getByRole("button", { name: "Contact" }));
    await user.type(screen.getByPlaceholderText("Search contact"), "northgate");
    expect(screen.getByRole("option", { name: /Priya Nair/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Lucy Chen" })).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText("Search contact"));
    await user.type(screen.getByPlaceholderText("Search contact"), "zzzz");
    expect(screen.getByText("No matches.")).toBeInTheDocument();
  });

  it("can go back to no record", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Picker initial={3} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Contact" })).toHaveTextContent("Lucy Chen");

    await user.click(screen.getByRole("button", { name: "Contact" }));
    await user.click(screen.getByRole("option", { name: "None" }));

    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.getByRole("button", { name: "Contact" })).toHaveTextContent("None");
  });

  it("shows its error", () => {
    render(
      <RecordPicker label="Deal" value={null} onChange={() => {}} options={[]} error="Choose a contact or deal" />,
    );

    expect(screen.getByText("Choose a contact or deal")).toBeInTheDocument();
  });
});
