// `npm run seed:live`: resets the database named in .env to the sample data. The seed
// names the database's host and waits for "yes" before it deletes anything (R41).
import { spawnSync } from "node:child_process";
import { loadLiveSettings } from "./env-file.mjs";

loadLiveSettings("npm run seed:live", ["DATABASE_URL"]);
const result = spawnSync("uv", ["run", "--directory", "backend", "python", "-m", "app.seed"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
process.exit(result.status ?? 1);
