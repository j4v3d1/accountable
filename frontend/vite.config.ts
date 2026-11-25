import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// The end-to-end tests run their own servers on other ports, so both ports
// can be moved with environment variables.
const webPort = Number(process.env.ACCOUNTABLE_WEB_PORT ?? 5173);
const apiPort = Number(process.env.ACCOUNTABLE_API_PORT ?? 8000);

export default defineConfig({
  plugins: [react()],
  server: {
    port: webPort,
    strictPort: true,
    proxy: {
      "/api": `http://127.0.0.1:${apiPort}`,
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/test/setup.ts"],
    // A stray it.only would quietly skip the other tests in its file, so it's always an error.
    allowOnly: false,
    // Every unit test runs in under a second, because CI runs on a much slower machine (R66).
    testTimeout: 1000,
    // `npm test` fails when unit tests cover less than 80% of the code.
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/test/**"],
      reporter: ["text-summary", "text"],
      skipFull: true,
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
