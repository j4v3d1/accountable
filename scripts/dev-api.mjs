// `npm run dev:api`: the backend for `npm run dev`, with local sign-in (R39, R54).
// It never reads .env, so it never touches Supabase (concern 23). Plain Node, so the
// setting works the same on macOS, Linux and Windows.
import { spawnSync } from "node:child_process";

const result = spawnSync(
  "uv",
  ["run", "--directory", "backend", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
  { stdio: "inherit", env: { ...process.env, ACCOUNTABLE_AUTH: "local" }, shell: process.platform === "win32" },
);
process.exit(result.status ?? 1);
