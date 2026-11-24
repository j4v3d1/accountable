import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeToggle } from "./ThemeToggle";

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
});

describe("ThemeToggle", () => {
  it("is named Dark mode, with the short label Dark, and isn't pressed in light mode", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: "Dark mode" });
    expect(button).toHaveTextContent("Dark");
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("turns dark mode on and saves it, then back to light", async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);
    const button = screen.getByRole("button", { name: "Dark mode" });

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem("accountable-theme")).toBe("dark");

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(document.documentElement).not.toHaveAttribute("data-theme");
    expect(localStorage.getItem("accountable-theme")).toBe("light");
  });

  it("starts pressed when dark mode was saved", () => {
    localStorage.setItem("accountable-theme", "dark");
    render(<ThemeToggle />);
    expect(screen.getByRole("button", { name: "Dark mode" })).toHaveAttribute("aria-pressed", "true");
  });
});
