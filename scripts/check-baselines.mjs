// Every Playwright baseline screenshot needs a copy for each platform `npm run check`
// runs on: Mac locally (-darwin) and Linux in CI (-linux). A missing one only shows
// up when CI fails, so this catches it on the Mac first.
import { readdirSync } from "node:fs";
import path from "node:path";

const E2E = path.resolve(import.meta.dirname, "..", "e2e");
const PLATFORMS = ["darwin", "linux"];

function snapshotFolders() {
  return readdirSync(E2E, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith("-snapshots"))
    .map((entry) => path.join(E2E, entry.name));
}

function missingIn(folder) {
  const files = new Set(readdirSync(folder));
  const names = new Set([...files].map((file) => file.replace(/-(darwin|linux|win32)\.png$/, "")));
  return [...names].flatMap((name) =>
    PLATFORMS.filter((platform) => !files.has(`${name}-${platform}.png`)).map((platform) =>
      path.relative(E2E, path.join(folder, `${name}-${platform}.png`)),
    ),
  );
}

const missing = snapshotFolders().flatMap(missingIn);
if (missing.length > 0) {
  console.log("Missing baseline screenshots:");
  for (const file of missing) console.log(`  e2e/${file}`);
  console.log(
    "\nLinux baselines come from CI: push, let the run fail, and copy the PNGs from its artifact.\n" +
      "Make them from the code as it was when the Mac baselines were taken.",
  );
  process.exit(1);
}
console.log("Every baseline screenshot has a Mac and a Linux copy.");
