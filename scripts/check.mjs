// `npm run check`: formatting, linting, type checks, the secrets scan and every
// test. `npm run check:quick` (--quick) leaves out the end-to-end tests.
import { runSteps, testSteps } from "./run-steps.mjs";

const quick = process.argv.includes("--quick");

const staticSteps = [
  { name: "Frontend formatting (Prettier)", command: "npm", args: ["run", "format:check", "--workspace", "frontend"] },
  { name: "Frontend lint (ESLint)", command: "npm", args: ["run", "lint", "--workspace", "frontend"] },
  { name: "Backend formatting (ruff format)", command: "uv", args: ["run", "ruff", "format", "--check", "backend"] },
  { name: "Backend lint (ruff check)", command: "uv", args: ["run", "ruff", "check", "backend"] },
  { name: "Backend type check (ty)", command: "uv", args: ["run", "ty", "check", "backend"] },
  { name: "Secrets in working files (gitleaks)", command: "gitleaks", args: ["dir", ".", "--no-banner", "--redact"] },
  { name: "Secrets in git history (gitleaks)", command: "gitleaks", args: ["git", ".", "--no-banner", "--redact"] },
];

// Runs before the tests: Playwright writes any missing baseline as it fails, which
// would make this pass afterwards. Left out of --quick along with the end-to-end
// tests, so the end-of-turn hook doesn't keep blocking on baselines only CI can make.
const baselineStep = {
  name: "Baseline screenshots for Mac and Linux",
  command: process.execPath,
  args: ["scripts/check-baselines.mjs"],
  endToEnd: true,
};

runSteps([...staticSteps, baselineStep, ...testSteps].filter((step) => !(quick && step.endToEnd)));
