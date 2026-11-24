import { afterEach, describe, expect, it, vi } from "vitest";
import { applyTheme, readTheme, saveTheme } from "./theme";

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  vi.restoreAllMocks();
});

describe("readTheme", () => {
  it("reads a missing value as light", () => {
    expect(readTheme()).toBe("light");
  });

  it("reads an unknown value as light", () => {
    localStorage.setItem("accountable-theme", "purple");
    expect(readTheme()).toBe("light");
  });

  it("reads dark as dark", () => {
    localStorage.setItem("accountable-theme", "dark");
    expect(readTheme()).toBe("dark");
  });

  it("reads light when storage can't be read", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage is off");
    });
    expect(readTheme()).toBe("light");
  });
});

describe("saveTheme", () => {
  it("saves the mode under accountable-theme", () => {
    saveTheme("dark");
    expect(localStorage.getItem("accountable-theme")).toBe("dark");
    saveTheme("light");
    expect(localStorage.getItem("accountable-theme")).toBe("light");
  });
});

describe("applyTheme", () => {
  it("marks the page dark, and light removes the mark", () => {
    applyTheme("dark");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    applyTheme("light");
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });
});
