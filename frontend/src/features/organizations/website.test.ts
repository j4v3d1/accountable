import { describe, expect, it } from "vitest";
import { displayWebsite, websiteHref } from "./website";

describe("websiteHref", () => {
  it("keeps a website that already has a scheme", () => {
    expect(websiteHref("https://northgaterealty.example.com")).toBe("https://northgaterealty.example.com");
    expect(websiteHref("http://example.com")).toBe("http://example.com");
  });

  it("adds https:// to a bare domain, even one that starts with http", () => {
    expect(websiteHref("example.com")).toBe("https://example.com");
    expect(websiteHref("httpie.io")).toBe("https://httpie.io");
  });

  it("recognises a scheme in capitals", () => {
    expect(websiteHref("HTTPS://Example.com")).toBe("HTTPS://Example.com");
  });
});

describe("displayWebsite", () => {
  it("leaves out the scheme and a trailing slash, in any case", () => {
    expect(displayWebsite("https://example.com/")).toBe("example.com");
    expect(displayWebsite("HTTPS://Example.com")).toBe("Example.com");
    expect(displayWebsite("httpie.io")).toBe("httpie.io");
  });
});
