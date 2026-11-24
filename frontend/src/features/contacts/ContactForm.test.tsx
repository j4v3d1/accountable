import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ContactForm } from "./ContactForm";

const organizations = [
  { id: 3, label: "Harbor Point Lending" },
  { id: 7, label: "Northgate Realty Partners" },
];

describe("ContactForm", () => {
  it("needs a first and last name", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ContactForm organizations={organizations} onSubmit={onSubmit} onCancel={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText("First name")).toHaveAccessibleDescription("Enter a first name");
    expect(screen.getByLabelText("Last name")).toHaveAccessibleDescription("Enter a last name");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("refuses an email that doesn't look valid", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ContactForm organizations={organizations} onSubmit={onSubmit} onCancel={() => {}} />);

    await user.type(screen.getByLabelText("First name"), "Lucy");
    await user.type(screen.getByLabelText("Last name"), "Chen");
    await user.type(screen.getByLabelText("Email"), "lucy-at-example.com");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByLabelText("Email")).toHaveAccessibleDescription("Enter a valid email address");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("chooses the organization from a searchable list, and defaults to Lead", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ContactForm organizations={organizations} onSubmit={onSubmit} onCancel={() => {}} />);

    await user.type(screen.getByLabelText("First name"), "Lucy");
    await user.type(screen.getByLabelText("Last name"), "Chen");
    await user.type(screen.getByLabelText("Email"), "lucy.chen@example.com");
    await user.click(screen.getByLabelText("Organization"));
    await user.type(screen.getByPlaceholderText("Search organization"), "harb");
    expect(screen.queryByRole("option", { name: /Northgate/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("option", { name: /Harbor Point Lending/ }));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(onSubmit).toHaveBeenCalledWith({
      first_name: "Lucy",
      last_name: "Chen",
      email: "lucy.chen@example.com",
      phone: null,
      job_title: null,
      organization_id: 3,
      status: "lead",
    });
  });
});
