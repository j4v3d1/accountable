// Claude Code PreToolUse hook: blocks the agent from writing or editing .env files
// (.env and .env.*, except .env.example). Exit 2 refuses the tool call.
import { readFileSync } from "node:fs";
import path from "node:path";

const input = JSON.parse(readFileSync(0, "utf8") || "{}");
const filePath = input.tool_input?.file_path ?? input.tool_input?.notebook_path ?? "";
const name = path.basename(filePath);

if (name === ".env" || (name.startsWith(".env.") && name !== ".env.example")) {
  process.stderr.write(`Editing ${name} is blocked: .env files hold secrets and are edited by people only.`);
  process.exit(2);
}
