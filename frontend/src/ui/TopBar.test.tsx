import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TopBar } from "./TopBar";

describe("the top bar", () => {
  it("puts the search on the left and the user menu on the right", () => {
    render(<TopBar search={<input aria-label="Search" />} account={<button type="button">Account menu</button>} />);

    const bar = screen.getByRole("banner");
    const [left, right] = Array.from(bar.children);
    expect(left).toContainElement(screen.getByRole("textbox", { name: "Search" }));
    expect(right).toContainElement(screen.getByRole("button", { name: "Account menu" }));
  });
});
