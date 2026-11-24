// `npm test`: runs every test suite in turn, even when an earlier one fails, then
// prints a summary and exits with an error if any of them failed (R43).
// Plain Node, so it works the same on macOS, Linux and Windows.
import { spawnSync } from "node:child_process";

const steps = [
  { name: "Backend unit tests (pytest)", args: ["run", "test:api"] },
  { name: "TypeScript check", args: ["run", "typecheck", "--workspace", "frontend"] },
  { name: "Frontend unit tests (Vitest)", args: ["run", "test", "--workspace", "frontend"] },
  { name: "End-to-end tests (Playwright)", args: ["run", "test:e2e"] },
];

// Under `npm test`, npm says where its own script is, so it can be run with this
// same Node. Elsewhere, fall back to `npm` on the PATH.
function runNpm(args) {
  const npmCli = process.env.npm_execpath;
  if (npmCli && npmCli.endsWith(".js")) {
    return spawnSync(process.execPath, [npmCli, ...args], { stdio: "inherit" });
  }
  return spawnSync("npm", args, { stdio: "inherit", shell: process.platform === "win32" });
}

const results = [];
for (const step of steps) {
  console.log(`\n=== ${step.name} ===\n`);
  const result = runNpm(step.args);
  if (result.signal) {
    // Stopped with Ctrl+C or similar: stop here rather than start the next suite.
    console.log(`\n${step.name} was stopped (${result.signal}).`);
    process.exit(1);
  }
  if (result.error) console.log(`\nCouldn't start ${step.name}: ${result.error.message}`);
  results.push({ name: step.name, passed: result.status === 0 });
}

const failed = results.filter((result) => !result.passed);
console.log("\n=== Summary ===\n");
for (const result of results) console.log(`  ${result.passed ? "passed" : "FAILED"}  ${result.name}`);
console.log(failed.length === 0 ? "\nAll tests passed." : `\n${failed.length} of ${results.length} failed.`);
process.exit(failed.length === 0 ? 0 : 1);
