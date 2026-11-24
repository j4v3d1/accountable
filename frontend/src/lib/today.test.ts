import { describe, expect, it } from "vitest";
import { initials } from "./initials";
import { todayIso } from "./format";

describe("todayIso", () => {
  it("writes the local date as YYYY-MM-DD", () => {
    expect(todayIso(new Date(2026, 10, 24, 23, 59))).toBe("2026-11-24");
    expect(todayIso(new Date(2027, 0, 1, 0, 1))).toBe("2027-01-01");
  });
});

describe("initials of a name with no letters or digits", () => {
  it("is empty", () => {
    expect(initials(" & ")).toBe("");
  });
});
