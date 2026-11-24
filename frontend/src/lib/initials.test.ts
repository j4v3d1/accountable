import { describe, expect, it } from "vitest";
import { AVATAR_TINTS, avatarFor, initials, tintFor } from "./initials";

describe("initials", () => {
  it("takes the first letter of the first and last words", () => {
    expect(initials("Priya Nair")).toBe("PN");
    expect(initials("Bayline Title & Escrow")).toBe("BE");
    expect(initials("madonna")).toBe("M");
  });
});

describe("avatarFor", () => {
  it("uses the contact first, then the organization, then nothing", () => {
    expect(avatarFor("Priya Nair", "Northgate Realty Partners")?.initials).toBe("PN");
    expect(avatarFor(null, "Ridgeline Development")?.initials).toBe("RD");
    expect(avatarFor(null, null)).toBeNull();
  });
});

describe("tintFor", () => {
  it("always gives the same name the same tint", () => {
    expect(tintFor("Priya Nair")).toBe(tintFor("Priya Nair"));
    expect(AVATAR_TINTS).toContain(tintFor("Omar Haddad"));
  });

  it("spreads names across the tints", () => {
    const names = ["Priya Nair", "Omar Haddad", "Lucy Chen", "Sam Okafor", "Rachel Kim", "Janet Moore", "Leo Martins"];
    expect(new Set(names.map(tintFor)).size).toBeGreaterThan(1);
  });
});
