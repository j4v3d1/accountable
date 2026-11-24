import { expect, test } from "./fixtures";
import { inDays } from "./today";

test("add, search, sort, edit and delete a deal", async ({ page }) => {
  await page.goto("/deals");
  const table = page.getByRole("table");

  await page.getByRole("button", { name: "New deal" }).click();
  const form = page.getByRole("dialog", { name: "New deal" });
  await form.getByLabel("Name").fill("5 Harbor View Ln purchase");
  await form.getByLabel("Main contact").click();
  await form.getByPlaceholder("Search main contact").fill("priya");
  await form.getByRole("option", { name: /Priya Nair/ }).click();
  await form.getByLabel("Stage").selectOption("showing");
  await expect(form.getByLabel("Probability (%)")).toHaveValue("40");
  await form.getByLabel("Value (USD)").fill("455000");
  await form.getByLabel("Close date").fill(inDays(45));
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form).toBeHidden();
  await expect(page.getByText("Deal saved", { exact: true })).toBeVisible();
  const row = table.getByRole("row", { name: /5 Harbor View Ln purchase/ });
  await expect(row).toContainText("Showing");
  await expect(row).toContainText("$455,000");
  await expect(row).toContainText("40%");
  await expect(row).toContainText("$182,000");
  await expect(row).toContainText("Priya Nair");

  await page.getByRole("searchbox", { name: "Search deals" }).fill("harbor view");
  await expect(table.getByRole("row")).toHaveCount(2);
  await page.getByRole("searchbox", { name: "Search deals" }).fill("");

  const value = table.getByRole("columnheader", { name: "Value (USD)" });
  await value.getByRole("button").click();
  await value.getByRole("button").click();
  await expect(table.getByRole("row").nth(1)).toContainText("Fairview Heights purchase");

  await page.getByRole("button", { name: "Edit 5 Harbor View Ln purchase" }).click();
  const edit = page.getByRole("dialog", { name: "Edit deal" });
  await edit.getByLabel("Stage").selectOption("offer");
  await expect(edit.getByLabel("Probability (%)")).toHaveValue("60");
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(edit).toBeHidden();
  await expect(row).toContainText("Offer");
  await expect(row).toContainText("60%");

  await page.reload();
  await row.getByRole("link", { name: "5 Harbor View Ln purchase" }).click();
  const timeline = page.getByRole("region", { name: "Timeline" });
  await expect(timeline.getByRole("listitem").first()).toContainText("Moved from Showing to Offer");

  await page.getByRole("button", { name: "Delete" }).click();
  const confirm = page.getByRole("alertdialog", { name: "Delete 5 Harbor View Ln purchase?" });
  await expect(confirm).toContainText("1 activity will be deleted.");
  await confirm.getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/deals$/);
  await expect(page.getByText("Deal saved", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Deal deleted", { exact: true })).toBeVisible();
  await expect(table.getByRole("row", { name: /5 Harbor View Ln purchase/ })).toHaveCount(0);
});

test("late deals show the Late badge, with the close date in Raspberry", async ({ page }) => {
  await page.goto("/deals");
  const table = page.getByRole("table");

  const late = table.getByRole("row", { name: /26 Ashford Dr sale/ });
  await expect(late.getByText("Late")).toBeVisible();
  await expect(late.locator(".late-date")).toHaveCSS("color", "rgb(196, 45, 82)");
  await expect(table.getByRole("row", { name: /55 Juniper St purchase/ }).getByText("Late")).toHaveCount(0);
});

test("the deal page shows its details, links and timeline", async ({ page }) => {
  await page.goto("/deals");
  await page.getByRole("link", { name: "Fairview Heights purchase" }).click();

  await expect(page.getByRole("heading", { name: "Fairview Heights purchase", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Chris Dunn" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Keystone Brokerage Group" })).toBeVisible();
  await expect(page.getByText("$902,000")).toBeVisible();
  const timeline = page.getByRole("region", { name: "Timeline" });
  await expect(timeline.getByRole("listitem").filter({ hasText: "Moved from Offer to Under Contract" })).toBeVisible();
});
