// Reads the Supabase settings from .env for `npm start` and `npm run seed:live`, the only
// commands that do (concern 23), and names any that are missing.
import { existsSync } from "node:fs";

export const LIVE_SETTINGS = ["DATABASE_URL", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"];

/** Loads .env into process.env (settings already in the environment win), then checks `needed`. */
export function loadLiveSettings(command, needed) {
  if (existsSync(".env")) process.loadEnvFile(".env");
  const missing = needed.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.error(`${command} needs ${missing.join(", ")} in .env. See .env.example and docs/STATUS.md.`);
    process.exit(1);
  }
}
