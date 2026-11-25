import { expect, SAM, signIn, test } from "./fixtures";

// Records are stamped with the real time; only today's date for the rules is fixed.
const ON_A_DAY = String.raw` on [A-Z][a-z]{2} \d{1,2}, \d{4}`;

test("a record shows the teammate who added it, and who changed it last", async ({ page }) => {
  await page.goto("/organizations");
  await page.getByRole("button", { name: "New organization" }).click();
  const form = page.getByRole("dialog", { name: "New organization" });
  await form.getByLabel("Name").fill("Cedar Bay Inspections");
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form).toBeHidden();
  await page.getByRole("link", { name: "Cedar Bay Inspections" }).click();

  const details = page.getByRole("region", { name: "Details" });
  await expect(details).toContainText(new RegExp(`Added by Maya Torres${ON_A_DAY}`));
  await expect(details).not.toContainText("Last changed by");

  // Sam Okafor signs in on the same browser and edits it.
  await page.evaluate(() => localStorage.removeItem("accountable-local-token"));
  await page.reload();
  await signIn(page, SAM);
  await page.getByRole("button", { name: "Edit" }).click();
  const edit = page.getByRole("dialog", { name: "Edit organization" });
  await edit.getByLabel("Notes").fill("Booked for every listing");
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(edit).toBeHidden();

  await expect(details).toContainText(new RegExp(`Added by Maya Torres${ON_A_DAY}`));
  await expect(details).toContainText(new RegExp(`Last changed by Sam Okafor${ON_A_DAY}`));
});

test("an activity shows who logged it, in the timeline and on the dashboard", async ({ page }) => {
  await page.goto("/contacts/1");
  await page.getByRole("button", { name: "Log activity" }).click();
  const form = page.getByRole("dialog", { name: "Log activity" });
  await form.getByLabel("Description").fill("Walked through the listing agreement");
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form).toBeHidden();

  const entry = page.getByRole("listitem").filter({ hasText: "Walked through the listing agreement" });
  await expect(entry).toContainText("Maya Torres");

  await page.goto("/");
  const recent = page.getByRole("region", { name: "Recent activity" });
  await expect(recent.getByRole("listitem").first()).toContainText("Walked through the listing agreement");
  await expect(recent.getByRole("listitem").first()).toContainText("Maya Torres");
});

test("a sample record shows Sample data", async ({ page }) => {
  await page.goto("/organizations/1");

  await expect(page.getByRole("region", { name: "Details" })).toContainText("Added by Sample data on");
});
