import { expect, MAYA, signIn, test } from "./fixtures";

const ROUTES = ["/", "/organizations", "/organizations/1", "/contacts", "/contacts/1", "/deals", "/deals/1", "/pipeline"];

test.describe("signed out", () => {
  test.use({ signedInAs: null });

  test("every route shows the sign-in screen, with no rail or top bar", async ({ page }) => {
    for (const route of [...ROUTES, "/no-such-page"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { name: "Sign in to Accountable", level: 1 })).toBeVisible();
      await expect(page).toHaveURL(route);
      await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
      await expect(page.getByText("Local mode. Sign in as a sample teammate")).toBeVisible();
    }
  });

  test("the API refuses every request without a token", async ({ page }) => {
    for (const path of ["/api/organizations", "/api/contacts", "/api/deals", "/api/dashboard", "/api/me"]) {
      expect((await page.request.get(path)).status(), path).toBe(401);
    }
    expect((await page.request.get("/api/health")).status()).toBe(200);
  });

  test.describe("with a wrong password", () => {
    // Chrome logs the refused sign-in request (401) as a console error.
    test.use({ allowedConsoleErrors: [/status of 401/] });

    test("says the email and password don't match", async ({ page }) => {
      await page.goto("/");
      await page.getByLabel("Email").fill(MAYA);
      await page.getByLabel("Password").fill("wrong");
      await page.getByRole("button", { name: "Sign in" }).click();

      await expect(page.getByRole("alert")).toHaveText("That email and password don't match.");
      await expect(page.getByRole("navigation", { name: "Main" })).toHaveCount(0);
    });
  });

  test("signing in opens the page that was asked for", async ({ page }) => {
    await page.goto("/contacts/1");

    await signIn(page, MAYA);

    await expect(page).toHaveURL("/contacts/1");
    await expect(page.getByRole("link", { name: "Contacts" }).first()).toBeVisible();
    await expect(page.getByRole("region", { name: "Details" })).toBeVisible();
  });

  test("signing in at the root opens the dashboard", async ({ page }) => {
    await page.goto("/");

    await signIn(page, MAYA);

    await expect(page.getByRole("heading", { name: "Dashboard", level: 1 })).toBeVisible();
  });
});

test("a session stays signed in after a reload", async ({ page }) => {
  await page.goto("/deals");
  await page.reload();

  await expect(page.getByRole("heading", { name: "Deals", level: 1 })).toBeVisible();
});
