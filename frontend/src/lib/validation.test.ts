import { describe, expect, it } from "vitest";
import { blankToNull, isEmail, isWebsite } from "./validation";

describe("isEmail", () => {
  it("accepts an ordinary address", () => {
    expect(isEmail("priya@northgate.com")).toBe(true);
  });

  it("refuses addresses without an @, a domain or a dot", () => {
    expect(isEmail("priya.northgate.com")).toBe(false);
    expect(isEmail("priya@northgate")).toBe(false);
    expect(isEmail("priya nair@northgate.com")).toBe(false);
  });
});

describe("isWebsite", () => {
  it("accepts a domain with or without the scheme, port and path", () => {
    expect(isWebsite("northgate.com")).toBe(true);
    expect(isWebsite("https://www.northgate-realty.com/team?page=2")).toBe(true);
    expect(isWebsite("http://localhost.dev:8080")).toBe(true);
  });

  it("refuses text that isn't a web address", () => {
    expect(isWebsite("northgate")).toBe(false);
    expect(isWebsite("not a website.com")).toBe(false);
    expect(isWebsite("ftp://northgate.com")).toBe(false);
  });
});

describe("blankToNull", () => {
  it("trims text and turns blank text into null", () => {
    expect(blankToNull("  Lucy Chen ")).toBe("Lucy Chen");
    expect(blankToNull("   ")).toBeNull();
    expect(blankToNull("")).toBeNull();
  });
});
