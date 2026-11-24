import { expect, test } from "./fixtures";

test("the organizations page lists the seeded organizations", async ({ page }) => {
  await page.goto("/organizations");

  await expect(page.getByRole("heading", { name: "Organizations" })).toBeVisible();
  const table = page.getByRole("table");
  await expect(table.getByRole("row")).toHaveCount(13);
  await expect(table.getByRole("link", { name: "Harbor Point Lending" })).toBeVisible();
});

test("add, search, sort, edit and delete an organization", async ({ page }) => {
  await page.goto("/organizations");
  const table = page.getByRole("table");

  await page.getByRole("button", { name: "New organization" }).click();
  const form = page.getByRole("dialog", { name: "New organization" });
  await form.getByLabel("Name").fill("Cedar Bay Inspections");
  await form.getByLabel("Website").fill("cedarbayinspections.example.com");
  await form.getByLabel("Industry").selectOption("Other");
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form).toBeHidden();
  await expect(page.getByText("Organization saved", { exact: true })).toBeVisible();
  await expect(table.getByRole("link", { name: "Cedar Bay Inspections" })).toBeVisible();

  const search = page.getByRole("searchbox", { name: "Search organizations" });
  await search.fill("cedar bay");
  await expect(table.getByRole("row")).toHaveCount(2);
  await search.fill("");

  const nameHeading = table.getByRole("columnheader", { name: "Name" });
  await nameHeading.getByRole("button").click();
  await nameHeading.getByRole("button").click();
  await expect(nameHeading).toHaveAttribute("aria-sort", "descending");
  await expect(table.getByRole("row").nth(1)).toContainText("Summit Residential Management");

  await page.getByRole("button", { name: "Edit Cedar Bay Inspections" }).click();
  const edit = page.getByRole("dialog", { name: "Edit organization" });
  await expect(edit.getByLabel("Name")).toHaveValue("Cedar Bay Inspections");
  await edit.getByLabel("Name").fill("Cedar Bay Home Inspections");
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(edit).toBeHidden();
  await expect(table.getByRole("link", { name: "Cedar Bay Home Inspections" })).toBeVisible();

  await page.reload();
  await expect(table.getByRole("link", { name: "Cedar Bay Home Inspections" })).toBeVisible();

  await page.getByRole("button", { name: "Delete Cedar Bay Home Inspections" }).click();
  const confirm = page.getByRole("alertdialog", { name: "Delete Cedar Bay Home Inspections?" });
  await expect(confirm).toContainText("Nothing else will change.");
  await confirm.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Organization deleted", { exact: true })).toBeVisible();
  await expect(table.getByRole("link", { name: "Cedar Bay Home Inspections" })).toHaveCount(0);

  await page.reload();
  await expect(table.getByRole("row")).toHaveCount(13);
});

test("the organization page lists its contacts and deals, and deleting it keeps them", async ({ page }) => {
  await page.goto("/organizations");
  await page.getByRole("link", { name: "Harbor Point Lending" }).click();

  await expect(page).toHaveURL(/\/organizations\/\d+$/);
  await expect(page.getByRole("heading", { name: "Harbor Point Lending", level: 1 })).toBeVisible();
  const contacts = page.getByRole("region", { name: "Contacts" });
  const deals = page.getByRole("region", { name: "Deals" });
  await expect(contacts.getByRole("link", { name: "Laura Mendes" })).toBeVisible();
  await expect(deals.getByRole("link", { name: "9 Willow Way purchase" })).toBeVisible();
  await expect(deals.getByRole("link")).toHaveCount(3);

  await page.getByRole("button", { name: "Delete" }).click();
  const confirm = page.getByRole("alertdialog", { name: "Delete Harbor Point Lending?" });
  await expect(confirm).toContainText("1 contact and 3 deals will be unlinked.");
  await confirm.getByRole("button", { name: "Delete" }).click();
  await expect(page).toHaveURL(/\/organizations$/);
  await expect(page.getByText("Organization deleted", { exact: true })).toBeVisible();

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Contacts" }).click();
  const laura = page.getByRole("row", { name: /Laura Mendes/ });
  await expect(laura).toBeVisible();
  await expect(laura).not.toContainText("Harbor Point Lending");
});
