import { expect, test } from "./fixtures";
import { NOON_TODAY, TIME_ZONE, TODAY } from "./today";

function dollars(text: string | null) {
  return Number((text ?? "").replace(/[^0-9]/g, ""));
}

test("every part of the dashboard renders", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
  const weekday = NOON_TODAY.toLocaleDateString("en-US", { weekday: "long", timeZone: TIME_ZONE });
  await expect(page.locator(".eyebrow")).toContainText(weekday, { ignoreCase: true });
  await expect(page.locator(".summary-line")).toContainText("open deals worth $");

  const revenue = page.getByRole("region", { name: "Revenue won" });
  await expect(revenue).toContainText("(USD)");
  await expect(revenue.locator(".recharts-surface")).toBeVisible();
  await expect(revenue.locator(".recharts-line-curve, .recharts-area-curve").first()).toBeVisible();
  for (const name of ["Open pipeline (USD)", "Expected revenue (USD)", "Deals won this month"]) {
    await expect(page.getByRole("region", { name })).toBeVisible();
  }
  const funnel = page.getByRole("region", { name: "Sales funnel" });
  await expect(funnel.getByRole("listitem")).toHaveCount(6);
  await expect(funnel).toContainText("Closed (Won)");
  const wonLost = page.getByRole("region", { name: "Won and lost" });
  await expect(wonLost.locator(".recharts-bar-rectangle").first()).toBeVisible();
  await expect(wonLost).toContainText("Win rate");
  await expect(page.getByRole("region", { name: "Pipeline by stage" })).toContainText("Under Contract");
  const followUps = page.getByRole("region", { name: "Follow-ups" });
  await expect(followUps.getByRole("list", { name: "Overdue" }).getByRole("listitem").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Recent activity" }).getByRole("listitem")).toHaveCount(10);
});

test("moving a deal to Closed (Won) raises revenue won this month and shows in recent activity", async ({ page }) => {
  await page.goto("/");
  const thisMonth = page.getByTestId("revenue-this-month");
  await expect(thisMonth).toHaveText(/\$/);
  const before = dollars(await thisMonth.textContent());

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Deals" }).click();
  await expect(page.getByRole("heading", { name: "Deals", level: 1 })).toBeVisible();
  await page.getByRole("table").getByRole("link", { name: "410 Sycamore Rd sale" }).click();
  await expect(page.getByRole("heading", { name: "410 Sycamore Rd sale", level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Edit deal" });
  await form.getByLabel("Stage").selectOption("closed_won");
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form).toBeHidden();
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Dashboard" }).click();

  await expect(thisMonth).toHaveText(`$${(before + 749000).toLocaleString("en-US")}`);
  const latest = page.getByRole("region", { name: "Recent activity" }).getByRole("listitem").first();
  await expect(latest).toContainText("Moved from Under Contract to Closed (Won)");
  await expect(latest.getByRole("link", { name: "410 Sycamore Rd sale" })).toBeVisible();
});

test("a new follow-up shows in the right group, and marking it done removes it", async ({ page }) => {
  await page.goto("/");
  const followUps = page.getByRole("region", { name: "Follow-ups" });

  await page.getByRole("button", { name: "Log activity" }).click();
  const form = page.getByRole("dialog", { name: "Log activity" });
  await form.getByRole("radio", { name: "Deal" }).check();
  await form.getByLabel("Deal", { exact: true }).click();
  await form.getByPlaceholder("Search deal").fill("parkside");
  await form.getByRole("option", { name: /Parkside loft 7C purchase/ }).click();
  await form.getByLabel("Description").fill("Send Nina the HOA documents");
  await form.getByLabel("Follow-up date").fill(TODAY);
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form).toBeHidden();

  const item = followUps.getByRole("list", { name: "This week" }).getByRole("listitem").filter({ hasText: "Send Nina the HOA documents" });
  await expect(item).toBeVisible();
  await expect(item.getByRole("link", { name: "Parkside loft 7C purchase" })).toBeVisible();

  await item.getByRole("button", { name: "Mark done" }).click();
  await expect(page.getByText("Follow-up done", { exact: true })).toBeVisible();
  await expect(followUps.getByText("Send Nina the HOA documents")).toHaveCount(0);
});

test("logging an activity from the dashboard needs a contact or deal", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Log activity" }).click();
  const form = page.getByRole("dialog", { name: "Log activity" });

  await form.getByLabel("Description").fill("Called about the open house");
  await form.getByRole("button", { name: "Save" }).click();

  await expect(form.getByText("Choose a contact")).toBeVisible();
  await expect(form).toBeVisible();
});

test("clicking the pipeline strip opens the pipeline", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("link", { name: "Open the pipeline" }).click();

  await expect(page).toHaveURL(/\/pipeline$/);
  await expect(page.getByRole("heading", { name: "Pipeline", level: 1 })).toBeVisible();
});
