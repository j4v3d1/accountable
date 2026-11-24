import { expect, test } from "./fixtures";

function inDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

test("log a call with a follow-up on a contact and a note on a deal; each comes first", async ({ page }) => {
  await page.goto("/contacts");
  await page.getByRole("link", { name: "Tom Whitaker" }).click();
  await page.getByRole("button", { name: "Log activity" }).click();
  const form = page.getByRole("dialog", { name: "Log activity" });
  await form.getByRole("radio", { name: "Call" }).check();
  await form.getByLabel("Description").fill("Called about a second showing");
  await form.getByLabel("Follow-up date").fill(inDays(3));
  await form.getByRole("button", { name: "Save" }).click();
  await expect(form).toBeHidden();
  await expect(page.getByText("Activity saved", { exact: true })).toBeVisible();
  const first = page.getByRole("region", { name: "Timeline" }).getByRole("listitem").first();
  await expect(first).toContainText("Called about a second showing");
  await expect(first).toContainText("Follow up");

  await page.goto("/deals");
  await page.getByRole("link", { name: "Parkside loft 7C purchase" }).click();
  await page.getByRole("button", { name: "Log activity" }).click();
  await page.getByRole("dialog", { name: "Log activity" }).getByLabel("Description").fill("Buyer asked about parking");
  await page.getByRole("dialog", { name: "Log activity" }).getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("region", { name: "Timeline" }).getByRole("listitem").first()).toContainText(
    "Buyer asked about parking",
  );
});

test("edit and delete activities; stage changes can't be edited or deleted", async ({ page }) => {
  await page.goto("/deals");
  await page.getByRole("link", { name: "Brookside cottage sale" }).click();
  const timeline = page.getByRole("region", { name: "Timeline" });

  const stageChange = timeline.getByRole("listitem").filter({ hasText: "Moved from Showing to Offer" });
  await expect(stageChange).toBeVisible();
  await expect(stageChange.getByRole("button")).toHaveCount(0);

  const note = timeline.getByRole("listitem").filter({ hasText: "Rachel Kim will accept $360,000" });
  await note.getByRole("button", { name: "Edit" }).click();
  const edit = page.getByRole("dialog", { name: "Edit activity" });
  await edit.getByLabel("Description").fill("Rachel Kim will accept $362,000");
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(timeline.getByRole("listitem").filter({ hasText: "Rachel Kim will accept $362,000" })).toBeVisible();

  const call = timeline.getByRole("listitem").filter({ hasText: "Call Rachel Kim about the inspection report" });
  await call.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Activity deleted", { exact: true })).toBeVisible();
  await expect(call).toHaveCount(0);
  await page.reload();
  await expect(timeline.getByRole("listitem").filter({ hasText: "Rachel Kim will accept $362,000" })).toBeVisible();
  await expect(timeline.getByRole("listitem").filter({ hasText: "Call Rachel Kim about the inspection" })).toHaveCount(0);
});
