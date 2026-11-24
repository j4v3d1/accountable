import { expect, test } from "./fixtures";

test("the app opens on the dashboard with sample data", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Dashboard" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.locator(".summary-line")).toContainText("open deals worth");
});

test("the rail reaches all five sections and marks the current one", async ({ page }) => {
  await page.goto("/");
  const rail = page.getByRole("navigation", { name: "Main" });

  for (const [link, heading, url] of [
    ["Orgs", "Organizations", /\/organizations$/],
    ["Contacts", "Contacts", /\/contacts$/],
    ["Deals", "Deals", /\/deals$/],
    ["Pipeline", "Pipeline", /\/pipeline$/],
    ["Dashboard", "Dashboard", /\/$/],
  ] as const) {
    await rail.getByRole("link", { name: link }).click();
    await expect(page).toHaveURL(url);
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    await expect(rail.getByRole("link", { name: link })).toHaveAttribute("aria-current", "page");
    await expect(rail.locator("[aria-current=page]")).toHaveCount(1);
  }
});

test("every route loads, including record pages", async ({ page }) => {
  for (const [list, recordHeading] of [
    ["/organizations", "Organizations"],
    ["/contacts", "Contacts"],
    ["/deals", "Deals"],
  ] as const) {
    await page.goto(list);
    await expect(page.getByRole("heading", { name: recordHeading, level: 1 })).toBeVisible();
    const first = page.getByRole("table").getByRole("row").nth(1).getByRole("link").first();
    const name = (await first.textContent())!;
    await first.click();
    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
  }
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { name: "Page not found", level: 1 })).toBeVisible();
});
