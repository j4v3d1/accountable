import { expect, test } from "./fixtures";

test("add, search, sort, edit and delete a contact", async ({ page }) => {
  await page.goto("/contacts");
  const table = page.getByRole("table");

  await page.getByRole("button", { name: "New contact" }).click();
  const form = page.getByRole("dialog", { name: "New contact" });
  await form.getByLabel("First name").fill("Wendy");
  await form.getByLabel("Last name").fill("Alder");
  await form.getByLabel("Email").fill("wendy.alder@example.com");
  await form.getByLabel("Status").selectOption("qualified");
  await form.getByLabel("Organization").click();
  await form.getByPlaceholder("Search organization").fill("stone");
  await form.getByRole("option", { name: /Stonebridge Mortgage/ }).click();
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form).toBeHidden();
  await expect(page.getByText("Contact saved", { exact: true })).toBeVisible();
  const row = table.getByRole("row", { name: /Wendy Alder/ });
  await expect(row).toContainText("Stonebridge Mortgage");
  await expect(row).toContainText("Qualified");

  await page.getByRole("searchbox", { name: "Search contacts" }).fill("alder");
  await expect(table.getByRole("row")).toHaveCount(2);
  await page.getByRole("searchbox", { name: "Search contacts" }).fill("");

  await table.getByRole("columnheader", { name: "Name" }).getByRole("button").click();
  await expect(table.getByRole("row").nth(1)).toContainText("Aisha Grant");

  await page.getByRole("button", { name: "Edit Wendy Alder" }).click();
  const edit = page.getByRole("dialog", { name: "Edit contact" });
  await edit.getByLabel("Phone").fill("(206) 555-0177");
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(edit).toBeHidden();
  await page.reload();
  await expect(table.getByRole("row", { name: /Wendy Alder/ })).toContainText("(206) 555-0177");

  await page.getByRole("button", { name: "Delete Wendy Alder" }).click();
  const confirm = page.getByRole("alertdialog", { name: "Delete Wendy Alder?" });
  await expect(confirm).toContainText("Nothing else will change.");
  await confirm.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Contact deleted", { exact: true })).toBeVisible();
  await page.reload();
  await expect(table.getByRole("row", { name: /Wendy Alder/ })).toHaveCount(0);
});

test("the status filter works together with search", async ({ page }) => {
  await page.goto("/contacts");
  const table = page.getByRole("table");
  const filter = page.getByRole("radiogroup", { name: "Status" });

  await filter.getByRole("radio", { name: "Customer" }).check();
  await expect(table.getByRole("row")).toHaveCount(13);
  for (const status of await table.locator("tbody .status-chip").allTextContents()) {
    expect(status).toBe("Customer");
  }

  await page.getByRole("searchbox", { name: "Search contacts" }).fill("harbor");
  await expect(table.getByRole("row")).toHaveCount(2);
  await expect(table.getByRole("row").nth(1)).toContainText("Laura Mendes");

  await filter.getByRole("radio", { name: "Lead" }).check();
  await expect(page.getByText('No matches for "harbor".')).toBeVisible();

  await filter.getByRole("radio", { name: "All" }).check();
  await page.getByRole("searchbox", { name: "Search contacts" }).fill("");
  await expect(table.getByRole("row")).toHaveCount(41);
});

test("the contact page shows the organization link, their deals and their timeline", async ({ page }) => {
  await page.goto("/contacts");
  await page.getByRole("link", { name: "Henry Park" }).click();

  await expect(page.getByRole("heading", { name: "Henry Park", level: 1 })).toBeVisible();
  await expect(page.getByRole("region", { name: "Deals" }).getByRole("link", { name: "Lakeshore Phase 1 unit purchase" })).toBeVisible();
  const timeline = page.getByRole("region", { name: "Timeline" });
  const stageChange = timeline.getByRole("listitem").filter({ hasText: /Moved from Offer to Lost/ });
  await expect(stageChange).toContainText("Lakeshore Phase 1 unit purchase");

  await page.getByRole("link", { name: "Lakeshore Builders" }).click();
  await expect(page.getByRole("heading", { name: "Lakeshore Builders", level: 1 })).toBeVisible();
});
