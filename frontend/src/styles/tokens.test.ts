import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "..");
const TOKENS = path.join(SRC, "styles", "tokens.css");
// This file names the color patterns, and tokens.css is where colors belong.
const ALLOWED = new Set([TOKENS, path.join(SRC, "styles", "tokens.test.ts")]);

// Keywords are matched in lowercase, as CSS writes them, so a WHITE constant isn't one.
const COLOR_PATTERNS = [/#[0-9a-f]{3,8}\b/i, /\brgba?\(/i, /\bhsla?\(/i, /(?<![\w-])(white|black)(?![\w-])/];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(full);
    return /\.(css|ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

/** Comments may say "white panel"; only code counts. */
function withoutComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function colorLines(file: string): string[] {
  return withoutComments(readFileSync(file, "utf8"))
    .split("\n")
    .filter((line) => COLOR_PATTERNS.some((pattern) => pattern.test(line)))
    .map((line) => `${path.relative(SRC, file)}: ${line.trim()}`);
}

type Mode = "light" | "dark";

/** The token values in one mode: dark mode is the light values with the dark block on top. */
function tokens(mode: Mode): Record<string, string> {
  const css = readFileSync(TOKENS, "utf8");
  const block = (selector: string) => {
    const start = css.indexOf(`${selector} {`);
    if (start < 0) throw new Error(`tokens.css has no ${selector} block`);
    const body = css.slice(start, css.indexOf("\n}", start));
    return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value]));
  };
  const light = block(":root");
  return mode === "light" ? light : { ...light, ...block(':root[data-theme="dark"]') };
}

function luminance(hex: string): number {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) throw new Error(`${hex} is not a six-digit hex color`);
  const [r, g, b] = [0, 2, 4].map((at) => {
    const channel = parseInt(match[1].slice(at, at + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const TEXT = [
  "--ink",
  "--ink-muted",
  "--sea-green-text",
  "--marigold-text",
  "--coral-text",
  "--cerulean-text",
  "--raspberry-text",
];
const SURFACES = ["--page", "--panel", "--soft", "--row-hover"];

/** Where text sits on something other than the page, a panel or a gray fill. */
const TEXT_ON_TINTS: [string, string][] = [
  ["--sea-green-text", "--sea-green-tint"],
  ["--marigold-text", "--marigold-tint-soft"],
  ["--cerulean-text", "--cerulean-tint"],
  ["--raspberry-text", "--raspberry-wash"],
  ["--raspberry-text", "--raspberry-pill"],
  ["--ink", "--raspberry-wash"],
  ["--ink-muted", "--raspberry-wash"],
  ["--ink", "--avatar-cerulean"],
  ["--ink", "--avatar-coral"],
  ["--ink", "--avatar-marigold"],
  ["--ink", "--avatar-sea-green"],
  ["--ink", "--column"],
  ["--ink-muted", "--column"],
  ["--ink", "--column-closed"],
  ["--ink-muted", "--column-closed"],
  ["--ink", "--card-closed"],
  ["--ink-muted", "--card-closed"],
];

/** Activity icons in their tinted circles: graphics, which need 3:1. */
const ICONS_ON_TINTS: [string, string][] = [
  ["--sea-green-text", "--sea-green-tint"],
  ["--marigold-text", "--marigold-tint"],
  ["--coral-text", "--coral-tint"],
  ["--cerulean-text", "--cerulean-tint"],
];

/**
 * Pairs light mode already had below 4.5:1 before dark mode. Light mode must not
 * change in this change (concern 15), so they're listed here rather than fixed.
 */
const KNOWN_LIGHT_GAPS = new Set(["--raspberry-text on --raspberry-pill"]);

/** White text only on 14px semibold or larger, which needs 3:1 (concern 2). */
const LARGE_WHITE_TEXT: [string, string][] = [
  ["--white", "--cerulean"],
  ["--white", "--raspberry"],
];

function pairs(mode: Mode, list: [string, string][], minimum: number) {
  const values = tokens(mode);
  return list.map(([text, surface]) => ({
    pair: `${text} on ${surface}`,
    passes: contrast(values[text], values[surface]) >= minimum,
  }));
}

describe.each(["light", "dark"] as const)("contrast in %s mode", (mode) => {
  it("body text passes 4.5:1 on every surface and tint it sits on", () => {
    const onSurfaces = TEXT.flatMap((text) => SURFACES.map((surface): [string, string] => [text, surface]));
    const failing = pairs(mode, [...onSurfaces, ...TEXT_ON_TINTS], 4.5)
      .filter((result) => !result.passes)
      .map((result) => result.pair)
      .filter((pair) => mode === "dark" || !KNOWN_LIGHT_GAPS.has(pair));
    expect(failing).toEqual([]);
  });

  it("a selected option stands off the page at 3:1, with readable text on it", () => {
    const failing = [
      ...pairs(mode, [["--selected", "--page"]], 3),
      ...pairs(mode, [["--on-selected", "--selected"]], 4.5),
    ].filter((result) => !result.passes);
    expect(failing).toEqual([]);
  });

  it("white text passes 3:1 on Cerulean and Raspberry, and icons 3:1 on their tints", () => {
    const failing = pairs(mode, [...LARGE_WHITE_TEXT, ...ICONS_ON_TINTS], 3).filter((result) => !result.passes);
    expect(failing).toEqual([]);
  });
});

describe("dark mode", () => {
  it("has its own page, panel and ink", () => {
    const [light, dark] = [tokens("light"), tokens("dark")];
    for (const name of ["--page", "--panel", "--ink"]) expect(dark[name]).not.toBe(light[name]);
  });
});

describe("color guard", () => {
  it("finds no color value outside tokens.css", () => {
    const found = sourceFiles(SRC)
      .filter((file) => !ALLOWED.has(file))
      .flatMap(colorLines);
    expect(found).toEqual([]);
  });
});
