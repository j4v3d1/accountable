// Claude Code Stop hook: runs `npm run check:quick` when the agent finishes a turn.
// On failure it blocks the stop once (exit 2) and sends the failing output back to
// the agent to fix. When the agent stops again after being blocked
// (stop_hook_active is true), it is let through, so this can't loop forever.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
if (input.stop_hook_active) process.exit(0);

const result = spawnSync("npm", ["run", "check:quick"], {
  cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(),
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
  shell: process.platform === "win32",
});
if (result.status === 0) process.exit(0);

// Keep the end of the output: the failing step and the summary are there.
const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
const tail = output.length > 20000 ? `...\n${output.slice(-20000)}` : output;
process.stderr.write(`npm run check:quick failed. Fix what it found, then finish.\n\n${tail}`);
process.exit(2);
