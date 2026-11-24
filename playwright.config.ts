import os from "node:os";
import path from "node:path";
import { defineConfig } from "@playwright/test";
import { TIME_ZONE, TODAY } from "./e2e/today";

// The end-to-end tests run their own backend and frontend on test ports, against
// a temporary database, so they never touch the agent's data or a running dev server.
const API_PORT = 8100;
const WEB_PORT = 5180;

// Set once in the runner; the worker processes inherit it, so all share one file.
process.env.ACCOUNTABLE_E2E_DB ??= path.join(os.tmpdir(), `accountable-e2e-${Date.now()}-${process.pid}.db`);
// Fixed for the backend, the reseed and this runner, which all inherit process.env.
process.env.ACCOUNTABLE_TODAY = TODAY;
process.env.TZ = TIME_ZONE;
export const E2E_DATABASE_URL = `sqlite:///${process.env.ACCOUNTABLE_E2E_DB.replaceAll("\\", "/")}`;

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.spec.ts",
  workers: 1,
  fullyParallel: false,
  // A stray test.only would quietly skip every other test, so it's always an error.
  forbidOnly: true,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  // The HTML report (playwright-report/) is what CI uploads when a run fails.
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    channel: "chrome",
    viewport: { width: 1440, height: 900 },
    timezoneId: TIME_ZONE,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: `uv run --directory backend uvicorn app.main:app --host 127.0.0.1 --port ${API_PORT}`,
      url: `http://127.0.0.1:${API_PORT}/api/stages`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { ACCOUNTABLE_DATABASE_URL: E2E_DATABASE_URL, ACCOUNTABLE_TODAY: TODAY, TZ: TIME_ZONE },
    },
    {
      command: "npm run dev --workspace frontend",
      url: `http://localhost:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { ACCOUNTABLE_WEB_PORT: String(WEB_PORT), ACCOUNTABLE_API_PORT: String(API_PORT) },
    },
  ],
});
