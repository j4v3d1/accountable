// Runs a list of steps in turn, even when an earlier one fails, then prints a
// summary and exits with an error if any of them failed. Used by `npm test` and
// `npm run check`. Plain Node, so it works the same on macOS, Linux and Windows.
import { spawnSync } from "node:child_process";

// The steps behind `npm test`. Unit tests fail below 80% coverage.
export const testSteps = [
  { name: "Backend unit tests (pytest)", command: "npm", args: ["run", "test:api"] },
  { name: "TypeScript check (tsc)", command: "npm", args: ["run", "typecheck", "--workspace", "frontend"] },
  { name: "Frontend unit tests (Vitest)", command: "npm", args: ["run", "test", "--workspace", "frontend"] },
  { name: "End-to-end tests (Playwright)", command: "npm", args: ["run", "test:e2e"], endToEnd: true },
];

// Under npm, npm says where its own script is, so it can be run with this same
// Node. Elsewhere, fall back to the command on the PATH.
function run(command, args) {
  const npmCli = process.env.npm_execpath;
  if (command === "npm" && npmCli && npmCli.endsWith(".js")) {
    return spawnSync(process.execPath, [npmCli, ...args], { stdio: "inherit" });
  }
  return spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
}

export function runSteps(steps) {
  const results = [];
  for (const step of steps) {
    console.log(`\n=== ${step.name} ===\n`);
    const result = run(step.command, step.args);
    if (result.signal) {
      // Stopped with Ctrl+C or similar: stop here rather than start the next step.
      console.log(`\n${step.name} was stopped (${result.signal}).`);
      process.exit(1);
    }
    if (result.error) console.log(`\nCouldn't start ${step.name}: ${result.error.message}`);
    results.push({ name: step.name, passed: result.status === 0 });
  }

  const failed = results.filter((result) => !result.passed);
  console.log("\n=== Summary ===\n");
  for (const result of results) console.log(`  ${result.passed ? "passed" : "FAILED"}  ${result.name}`);
  console.log(failed.length === 0 ? "\nAll passed." : `\n${failed.length} of ${results.length} failed.`);
  process.exit(failed.length === 0 ? 0 : 1);
}
