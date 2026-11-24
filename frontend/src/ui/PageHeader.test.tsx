import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Avatar } from "./Avatar";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("shows the eyebrow, title, lede and actions", () => {
    render(
      <PageHeader
        eyebrow="Tuesday, November 24"
        title="Dashboard"
        lede="18 open deals"
        actions={<button type="button">New deal</button>}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByText("Tuesday, November 24")).toBeInTheDocument();
    expect(screen.getByText("18 open deals")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New deal" })).toBeInTheDocument();
  });

  it("shows only the title when that's all it's given", () => {
    const { container } = render(<PageHeader title="Contacts" />);

    expect(container).toHaveTextContent(/^Contacts$/);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("Avatar", () => {
  it("shows the contact's initials, named after the contact", () => {
    render(<Avatar contactName="Priya Nair" organizationName="Northgate Realty Partners" size={40} />);

    expect(screen.getByTitle("Priya Nair")).toHaveTextContent("PN");
  });

  it("falls back to the organization, and shows nothing when there is neither", () => {
    const { container, rerender } = render(<Avatar organizationName="Ridgeline Development" />);
    expect(screen.getByTitle("Ridgeline Development")).toHaveTextContent("RD");

    rerender(<Avatar contactName={null} organizationName={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
