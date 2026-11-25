import type { Locator, Page } from "@playwright/test";
import { dragTo, expect, signedInHeaders, test } from "./fixtures";
import { inDays } from "./today";

function column(page: Page, label: string) {
  return page.getByRole("region", { name: `${label} column` });
}

function card(scope: Page | Locator, name: string) {
  return scope.locator(".deal-card", { hasText: name });
}

async function centre(locator: Locator) {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function topEdge(locator: Locator) {
  const box = (await locator.boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + 8 };
}

function dollars(text: string | null) {
  return Number((text ?? "").replace(/[^0-9]/g, ""));
}

async function cardNames(scope: Locator) {
  return scope.locator(".deal-card .card-name").allTextContents();
}

test("drag a card to another column: its stage, probability and the totals change straight away", async ({ page }) => {
  await page.goto("/pipeline");
  const showing = column(page, "Showing");
  const offer = column(page, "Offer");
  await expect(card(showing, "Parkside loft 7C purchase")).toBeVisible();
  const expectedBefore = dollars(await page.getByTestId("summary-expected").textContent());
  const valueBefore = dollars(await page.getByTestId("summary-value").textContent());
  await expect(offer.locator(".column-count")).toHaveText("4");

  await dragTo(page, await centre(card(showing, "Parkside loft 7C purchase")), await centre(card(offer, "142 Maple Ave purchase")));

  await expect(card(offer, "Parkside loft 7C purchase")).toBeVisible();
  await expect(offer.locator(".column-count")).toHaveText("5");
  await expect(showing.locator(".column-count")).toHaveText("2");
  await expect(card(offer, "Parkside loft 7C purchase")).toContainText("60%");
  // $432,000 moving from 40% to 60% adds $86,400 of expected revenue; open value stays the same.
  await expect(page.getByTestId("summary-expected")).toHaveText(`$${(expectedBefore + 86400).toLocaleString("en-US")}`);
  expect(dollars(await page.getByTestId("summary-value").textContent())).toBe(valueBefore);

  await page.goto("/deals");
  const row = page.getByRole("row", { name: /Parkside loft 7C purchase/ });
  await expect(row).toContainText("Offer");
  await expect(row).toContainText("60%");
});

test("drag a card higher in its own column, and it stays there after a refresh", async ({ page }) => {
  await page.goto("/pipeline");
  const newLead = column(page, "New Lead");
  await expect.poll(() => cardNames(newLead)).toEqual(["88 Birchwood Ct purchase", "17 Orchard Ln purchase", "Riverside lot 12 sale"]);

  const saved = page.waitForResponse((r) => r.url().includes("/move") && r.ok());
  await dragTo(page, await centre(card(newLead, "Riverside lot 12 sale")), await topEdge(card(newLead, "88 Birchwood Ct purchase")));
  await saved;

  await expect.poll(() => cardNames(newLead)).toEqual(["Riverside lot 12 sale", "88 Birchwood Ct purchase", "17 Orchard Ln purchase"]);
  await page.reload();
  await expect.poll(() => cardNames(newLead)).toEqual(["Riverside lot 12 sale", "88 Birchwood Ct purchase", "17 Orchard Ln purchase"]);
});

test("move a card with the keyboard", async ({ page }) => {
  await page.goto("/pipeline");
  const orchard = card(column(page, "New Lead"), "17 Orchard Ln purchase");

  // Each key waits for what a person would see: the card lifting, then sitting in the next column.
  await orchard.focus();
  await page.keyboard.press("Space");
  await expect(orchard).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowRight");
  await expect(card(column(page, "Qualified"), "17 Orchard Ln purchase")).toHaveCount(1);
  const saved = page.waitForResponse((r) => r.url().includes("/move") && r.ok());
  await page.keyboard.press("Space");
  await saved;

  await expect(card(column(page, "Qualified"), "17 Orchard Ln purchase")).toBeVisible();
  await expect(card(column(page, "Qualified"), "17 Orchard Ln purchase")).toContainText("20%");
  await page.reload();
  await expect(card(column(page, "Qualified"), "17 Orchard Ln purchase")).toBeVisible();
});

test("drag a card into an empty column", async ({ page }) => {
  const headers = await signedInHeaders(page);
  const deals = (await (await page.request.get("/api/deals", { headers })).json()) as { id: number; stage: string }[];
  for (const deal of deals.filter((d) => d.stage === "under_contract")) {
    await page.request.post(`/api/deals/${deal.id}/move`, { headers, data: { stage: "offer", index: 0 } });
  }
  await page.goto("/pipeline");
  const underContract = column(page, "Under Contract");
  await expect(underContract.locator(".column-count")).toHaveText("0");

  await dragTo(page, await centre(card(column(page, "Offer"), "55 Juniper St purchase")), await centre(underContract.locator(".column-cards")));

  await expect(card(underContract, "55 Juniper St purchase")).toBeVisible();
  await expect(underContract.locator(".column-count")).toHaveText("1");
  await page.reload();
  await expect(card(underContract, "55 Juniper St purchase")).toContainText("90%");
});

test.describe("when the server refuses a move", () => {
  test.use({ allowedConsoleErrors: [/status of 422/] });

  test("the card goes back and an error shows", async ({ page }) => {
    await page.route("**/api/deals/*/move", (route) =>
      route.fulfill({ status: 422, contentType: "application/json", body: JSON.stringify({ detail: "That move isn't allowed" }) }),
    );
    await page.goto("/pipeline");
    const showing = column(page, "Showing");

    await dragTo(page, await centre(card(showing, "Summit View purchase")), await centre(card(column(page, "Lost"), "Northfield purchase")));

    await expect(page.getByText("That move isn't allowed", { exact: true })).toBeVisible();
    await expect(card(showing, "Summit View purchase")).toBeVisible();
    await expect(card(showing, "Summit View purchase")).toContainText("45%");
    await expect(card(column(page, "Lost"), "Summit View purchase")).toHaveCount(0);
  });
});

test("a deal added in a column starts at that stage, at the top", async ({ page }) => {
  await page.goto("/pipeline");
  const showing = column(page, "Showing");

  await showing.getByRole("button", { name: "Add deal" }).click();
  const form = page.getByRole("dialog", { name: "New deal" });
  await expect(form.getByLabel("Stage")).toHaveValue("showing");
  await expect(form.getByLabel("Probability (%)")).toHaveValue("40");
  await form.getByLabel("Name").fill("Lakeview condo 4B sale");
  await form.getByLabel("Value (USD)").fill("389000");
  await form.getByLabel("Close date").fill(inDays(60));
  await form.getByRole("button", { name: "Save" }).click();

  await expect(form).toBeHidden();
  await expect.poll(() => cardNames(showing)).toEqual([
    "Lakeview condo 4B sale",
    "26 Ashford Dr sale",
    "Parkside loft 7C purchase",
    "Summit View purchase",
  ]);
});

test("clicking a card opens the deal, and late deals stand out", async ({ page }) => {
  await page.goto("/pipeline");

  await expect(card(column(page, "Showing"), "26 Ashford Dr sale")).toContainText("Late");
  await expect(card(column(page, "Offer"), "142 Maple Ave purchase")).not.toContainText("Late");
  await expect(page.getByTestId("summary-late")).toHaveText("3 deals");

  await card(column(page, "Offer"), "142 Maple Ave purchase").click();

  await expect(page).toHaveURL(/\/deals\/\d+$/);
  await expect(page.getByRole("heading", { name: "142 Maple Ave purchase", level: 1 })).toBeVisible();
});
