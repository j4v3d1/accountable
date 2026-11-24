import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { Rail } from "./Rail";

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Rail />
    </MemoryRouter>,
  );
}

describe("Rail", () => {
  it("links to the five sections", () => {
    renderAt("/");
    const nav = screen.getByRole("navigation", { name: "Main" });
    const links = Array.from(nav.querySelectorAll("a")).map((a) => [a.textContent, a.getAttribute("href")]);
    expect(links).toEqual([
      ["Dashboard", "/"],
      ["Orgs", "/organizations"],
      ["Contacts", "/contacts"],
      ["Deals", "/deals"],
      ["Pipeline", "/pipeline"],
    ]);
  });

  it("marks the current section, including on a record page", () => {
    renderAt("/contacts/12");
    expect(screen.getByRole("link", { name: "Contacts" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });
});

describe("Rail's dark mode button", () => {
  it("sits in the rail", () => {
    renderAt("/");
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("button", { name: "Dark mode" })).toBeInTheDocument();
  });
});
