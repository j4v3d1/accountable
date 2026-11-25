// `npm start`: runs the built app the way Render does, on this computer, signed in with
// Supabase (R63). Reads .env, builds the frontend, then starts FastAPI, which runs the
// migrations and serves the frontend and the API from one address. No Vite, no proxy.
import { spawnSync } from "node:child_process";
import { LIVE_SETTINGS, loadLiveSettings } from "./env-file.mjs";

const shell = process.platform === "win32";

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, { stdio: "inherit", env, shell });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

loadLiveSettings("npm start", LIVE_SETTINGS);
const port = process.env.PORT || "8000";

run("npm", ["run", "build", "--workspace", "frontend"]);
console.log(`\nAccountable is starting at http://localhost:${port}\n`);
run("uv", ["run", "--directory", "backend", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", port], {
  ...process.env,
  ACCOUNTABLE_AUTH: "supabase",
});
