import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// Computed colors, as the browser reports them.
const DARK_PAGE = "rgb(4, 35, 46)"; // #04232E
const LIGHT_PAGE = "rgb(240, 244, 245)"; // #F0F4F5
const BLACK = "rgb(0, 0, 0)";
const MIDNIGHT = "rgb(7, 59, 76)";
const DARK_INK_MUTED = "rgb(143, 169, 177)"; // #8FA9B1
const DARK_CHART_AXIS = "rgb(46, 74, 83)"; // #2E4A53

const ROUTES = ["/", "/organizations", "/organizations/1", "/contacts", "/contacts/1", "/deals", "/deals/1", "/pipeline"];

function darkModeButton(page: Page) {
  return page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Dark mode" });
}

async function turnDarkOn(page: Page) {
  await page.goto("/");
  await darkModeButton(page).click();
  await expect(page.locator("body")).toHaveCSS("background-color", DARK_PAGE);
}

test("the app opens in light mode, with the Dark mode button on every route", async ({ page }) => {
  for (const route of ROUTES) {
    await page.goto(route);
    await expect(darkModeButton(page)).toHaveAttribute("aria-pressed", "false");
  }
  await expect(page.locator("html")).not.toHaveAttribute("data-theme");
  await expect(page.locator("body")).toHaveCSS("background-color", LIGHT_PAGE);
});

test("pressing the button turns the page dark straight away, and it shows as pressed", async ({ page }) => {
  await turnDarkOn(page);
  await expect(darkModeButton(page)).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Pipeline" }).click();
  await expect(page.locator("body")).toHaveCSS("background-color", DARK_PAGE);
});

test("dark mode is still on after a reload, and pressing again goes back to light for good", async ({ page }) => {
  await turnDarkOn(page);
  await page.reload();
  await expect(page.locator("body")).toHaveCSS("background-color", DARK_PAGE);
  await expect(darkModeButton(page)).toHaveAttribute("aria-pressed", "true");

  await darkModeButton(page).click();
  await expect(page.locator("body")).toHaveCSS("background-color", LIGHT_PAGE);
  await page.reload();
  await expect(page.locator("body")).toHaveCSS("background-color", LIGHT_PAGE);
  await expect(darkModeButton(page)).toHaveAttribute("aria-pressed", "false");
});

test.describe("before the app draws", () => {
  // The app's script is blocked on purpose, and the browser logs that.
  test.use({ allowedConsoleErrors: [/Failed to load resource/] });

  // With the app blocked, nothing but index.html can have marked the page.
  test("the saved dark mode is already applied by index.html", async ({ page }) => {
    await turnDarkOn(page);
    await page.route("**/src/main.tsx", (route) => route.abort());
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.locator("#root")).toBeEmpty();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});

test("dialogs and the dashboard's charts follow dark mode", async ({ page }) => {
  await turnDarkOn(page);

  const chart = page.getByRole("img", { name: /Deals won and lost per month/ });
  // The month labels under the bars, and the line between won and lost.
  await expect(chart.getByText("Nov", { exact: true })).toHaveCSS("fill", DARK_INK_MUTED);
  await expect(chart.locator(".recharts-reference-line-line")).toHaveCSS("stroke", DARK_CHART_AXIS);
  // Text on the funnel's stage colors stays Midnight, as the stage colors don't change.
  const funnel = page.getByRole("region", { name: "Sales funnel" });
  await expect(funnel.getByLabel(/^\d+ deals$/).first()).toHaveCSS("color", MIDNIGHT);

  await page.getByRole("button", { name: "Log activity" }).click();
  await expect(page.getByRole("dialog", { name: "Log activity" })).toHaveCSS("background-color", BLACK);
});
