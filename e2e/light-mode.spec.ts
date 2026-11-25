import type { Page } from "@playwright/test";
import { expect, signedInHeaders, test } from "./fixtures";

// Every page in light mode must look exactly as it did before dark mode, apart from
// the dark mode button, which is masked (concern 15). Today's date, the clock and
// the time zone are fixed for the run (see today.ts), so the sample data is the same.

// A tall window shows most of each page in one screenshot.
test.use({ viewport: { width: 1440, height: 1800 } });

const PAGES: { name: string; path: string; heading: string }[] = [
  { name: "dashboard", path: "/", heading: "Dashboard" },
  { name: "organizations", path: "/organizations", heading: "Organizations" },
  { name: "organization", path: "/organizations/1", heading: "" },
  { name: "contacts", path: "/contacts", heading: "Contacts" },
  { name: "contact", path: "/contacts/1", heading: "" },
  { name: "deals", path: "/deals", heading: "Deals" },
  { name: "deal", path: "/deals/1", heading: "" },
  { name: "pipeline", path: "/pipeline", heading: "Pipeline" },
  { name: "not-found", path: "/no-such-page", heading: "Page not found" },
];

/** The record's heading, read from the API, which also proves the record exists. */
async function recordHeading(page: Page, path: string): Promise<string> {
  const response = await page.request.get(`/api${path}`, { headers: await signedInHeaders(page) });
  expect(response.ok(), `${path} exists in the sample data`).toBe(true);
  const record = await response.json();
  return record.name ?? `${record.first_name} ${record.last_name}`;
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(0, 0);
}

function screenshotOptions(page: Page) {
  return {
    fullPage: true,
    animations: "disabled" as const,
    caret: "hide" as const,
    // The baselines were taken before the toggle existed, so the mask is painted in
    // the rail's Midnight: the hidden toggle then looks like the empty rail it sits on.
    // includeHidden finds it under an open dialog too, which hides the page from the accessibility tree.
    mask: [page.getByRole("button", { name: "Dark mode", includeHidden: true })],
    maskColor: "#073B4C",
  };
}

for (const { name, path, heading } of PAGES) {
  test(`${name} looks as it did before dark mode`, async ({ page }) => {
    const title = heading || (await recordHeading(page, path));
    await page.goto(path);
    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
    await settle(page);
    await expect(page).toHaveScreenshot(`${name}.png`, screenshotOptions(page));
  });
}

test("the delete dialog looks as it did before dark mode", async ({ page }) => {
  await page.goto("/organizations");
  await page.getByRole("button", { name: "Delete Harbor Point Lending" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Delete Harbor Point Lending?" });
  await expect(dialog.getByRole("button", { name: "Delete" })).toBeEnabled();
  await settle(page);
  await expect(page).toHaveScreenshot("delete-dialog.png", screenshotOptions(page));
});
