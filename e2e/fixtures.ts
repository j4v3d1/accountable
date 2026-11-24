import { execFileSync } from "node:child_process";
import { test as base, expect, type Page } from "@playwright/test";
import { NOON_TODAY } from "./today";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Reset the test database to the sample data, with the same command an agent uses. */
function reseed() {
  const file = process.env.ACCOUNTABLE_E2E_DB;
  if (!file) throw new Error("ACCOUNTABLE_E2E_DB is not set; run the tests through playwright.config.ts");
  execFileSync("uv", ["run", "--directory", "backend", "python", "-m", "app.seed"], {
    env: { ...process.env, ACCOUNTABLE_DATABASE_URL: `sqlite:///${file.replaceAll("\\", "/")}` },
    stdio: "pipe",
  });
}

type Options = {
  /** Console errors a test expects, such as the browser's note about a refused request. */
  allowedConsoleErrors: RegExp[];
};

/**
 * Every test starts from freshly seeded data at noon on the fixed TODAY, and fails if the browser console logs
 * an error or the page requests anything that isn't on localhost (which proves the
 * app works offline).
 */
export const test = base.extend<Options & { guard: void }>({
  allowedConsoleErrors: [[], { option: true }],
  guard: [
    async ({ page, allowedConsoleErrors }, use) => {
      reseed();
      await page.clock.setFixedTime(NOON_TODAY);
      const errors: string[] = [];
      const offsite: string[] = [];
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const text = message.text();
        if (!allowedConsoleErrors.some((pattern) => pattern.test(text))) errors.push(text);
      });
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("request", (request) => {
        const url = new URL(request.url());
        if (!["http:", "https:", "ws:", "wss:"].includes(url.protocol)) return;
        if (!LOCAL_HOSTS.has(url.hostname)) offsite.push(request.url());
      });
      await use();
      expect(errors, "console errors").toEqual([]);
      expect(offsite, "requests that left localhost").toEqual([]);
    },
    { auto: true },
  ],
});

/**
 * Drag with small stepped mouse moves. dnd-kit waits for a few pixels of movement
 * before a drag starts, so a single jump (as in Playwright's dragTo) may not start one.
 */
export async function dragTo(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 4, from.y + 4, { steps: 4 });
  await page.mouse.move(to.x, to.y, { steps: 20 });
  await page.mouse.move(to.x, to.y + 1, { steps: 2 });
  await page.mouse.up();
}

export { expect };
