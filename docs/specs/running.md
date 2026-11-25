# Running, checks and tests

How Accountable is started, seeded, migrated, tested, checked and deployed, and the hooks, CI and subagents around it. Part of the spec; the summary and index are in `docs/spec.md`.

## Concerns

- **4. Setup before the one command.** `npm run dev` needs Node.js and uv installed, and `npm install` run once. `docs/STATUS.md` lists these setup steps. `npm run dev` runs `uv sync` itself before it starts the backend, so there's no separate Python step. `npm start` and `npm run seed:live` also need a `.env` with the three Supabase settings (concern 23), which the person writes themselves.
- **15. Proving light mode hasn't changed.** Moving every color into tokens touches most style files, so a Playwright visual test compares each page in light mode with screenshots taken before the change. Dates in the sample data and on screen follow today, so the visual test fixes today's date in both the backend and the browser. Screenshots differ slightly between Mac and Linux, so there's a Mac baseline and a Linux baseline. `npm run check` on a Mac compares against the Mac one. CI no longer runs the end-to-end tests (R47), so the Linux baselines are kept but nothing compares against them. The top bar and the user menu change every page, so this change takes both sets of baselines again once they're built. The visual test signs in as Maya Torres, whose initials are always MT, and saves `light` first, since a browser with no saved choice now follows the device.
- **23. Which commands read `.env`.** Only `npm start` and `npm run seed:live` read `.env`. `npm run dev`, `npm run seed`, `npm test`, `npm run check` and CI never do, and they set their own SQLite database and local sign-in (concern 16), so they never touch Supabase whether `.env` is filled in or not. Supabase is reached only by the live app, by `npm start`, and by `npm run seed:live` after the person types "yes".

## Requirements

- **R39** `npm run dev` starts the backend and the frontend together and prints the address to open. It works on Mac, Linux and Windows. It runs against the local SQLite file with local sign-in (R54), needs no internet connection, and never reads `.env` (concern 23).
- **R40** When the backend starts with a database that has no organizations table yet, it runs the migrations (R65) and fills the new database with sample data. On later starts it runs any new migrations but does not seed again, even if every record has been deleted. This preserves intentional deletions (R5).
- **R41** `npm run seed` deletes every organization, contact, deal and activity and loads the sample data again, in the database `DATABASE_URL` names, or the local SQLite file when it's not set. It keeps the `users` table. It's safe to run while the app is running. Against a database that isn't SQLite, it first prints "This will delete every record in the database at <host>." and waits for the person to type "yes"; anything else stops it with nothing changed. `npm run seed:live` does the same with the settings from `.env`, so it always asks.
- **R42** The sample data is set in Cedar Bay, a fictional US metro area, so every screen looks alive the first time the app starts:
  - 12 organizations across the industries in R7;
  - 40 contacts at every status;
  - 30 deals at every stage, including deals won and lost over the past six months, open deals closing in the months ahead, and 3 or 4 late deals;
  - 80 activities, with follow-ups both overdue and due soon, plus stage-change history for deals past New Lead.

  All dates are worked out relative to the day the seed runs, so the data never looks stale. Names are invented and use reserved domains such as `example.com`. The data is built from a fixed random seed, so every reset gives the same result.
- **R43** `npm test` runs the pytest tests, the TypeScript check, the Vitest tests and the Playwright tests, against a database and ports of their own, with local sign-in (concern 23). It runs all four even when one fails, prints a summary, and fails if any of them fails. It also fails when the backend's or the frontend's unit tests cover less than 80% of their code, or when a unit test takes a second or more (R66).
- **R44** `npm run check` runs every check and fails if any of them fails: Prettier and ESLint (recommended TypeScript, React Hooks and accessibility rules) for the frontend, `ruff format` and `ruff check` for the backend, a cyclomatic complexity of at most 15 per function (ESLint's `complexity`, ruff's `C901`), `tsc` for the frontend and `ty` for the backend, gitleaks across the working files and the git history (the git-ignored `.env` is allowed), and `npm test`. `npm run check:quick` runs the same checks without the end-to-end tests. `npm run format` fixes the formatting.
- **R45** A git pre-commit hook (lefthook, installed by `npm install`) formats the staged files with Prettier and `ruff format` and stages the result, then runs ESLint, `ruff check`, `tsc`, `ty` and gitleaks on the staged changes. It skips the tests so commits stay quick, and refuses the commit if any of them fails.
- **R46** Claude Code hooks in `.claude/settings.json`: when the agent finishes a turn, `npm run check:quick` runs and any failure is sent back to the agent to fix. It blocks the stop once, then lets the agent stop, so it can't loop. The agent can't write or edit `.env` or `.env.*` files (`.env.example` is allowed).
- **R47** GitHub Actions (`.github/workflows/ci.yml`) runs one job, `check`, on every push to any branch. It installs gitleaks and scans the working files and the whole git history first, so a leaked secret fails the run straight away. Then it installs Node and uv and runs `npm run check:quick`: every check except the end-to-end tests and the baseline check, which run only locally with `npm run check`. The workflow uses no secrets.
- **R48** Two Claude Code subagents in `.claude/agents/`, both on Sonnet. `reviewer` reviews a branch's changes against `docs/REVIEW.md` and reports findings by severity (Important, other findings, at most five nits); it can read files and run commands that only read, such as `git diff`, `git log` and `git show`, and changes nothing. `ui-check` opens each page of the running app (`npm run dev`) with the Playwright MCP server, signed in as a made-up teammate (R54), in light and dark mode, screenshots it into `.playwright-mcp/` (git-ignored), checks it against the brand skill and this spec, and reports anything broken or off-brand; it has no tools to change files.
- **R63** `npm start` runs the app the way Render does, on this computer: it reads the settings from `.env`, builds the frontend, and starts FastAPI on port 8000 (or `PORT` when it's set), which runs the migrations (R65) and then serves the built frontend and the API from one address, signed in with Supabase. It prints the address to open. Without all three settings, it stops and names the missing ones. It uses no Vite server and no proxy.
- **R64** The app deploys to Render's free plan as one web service, described in `render.yaml` at the repo root:
  - the build installs the Python and Node dependencies and builds the frontend; the start command starts FastAPI as `npm start` does, on Render's `PORT`;
  - `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are listed with `sync: false`, so they're entered in Render's dashboard and never written in the file;
  - `PYTHON_VERSION` is a 3.12 release, and `TZ` is `America/New_York`, so `today()` (and so late deals and overdue follow-ups) follows the team's day;
  - the region is the Render region nearest the Supabase project;
  - the health check is `GET /api/health`;
  - it deploys `main` only after CI passes on it, and names no branch in the file.

  The app answers at its `onrender.com` address (concern 22). Render's free plan sleeps after 15 minutes without visits and takes about a minute to wake.
- **R65** **Migrations.** The database's tables come from Alembic migrations in `backend/migrations/`, which run every time the backend starts, on SQLite and Postgres alike. The first migration is the baseline: the tables as they were before this change. A database that already has those tables but no record of migrations, such as an existing local file, is marked as at the baseline first, so no data is lost. The next migration adds `users`, the reserved "Sample data" person and the who-added columns (concern 18), and turns on row-level security (concern 20). Every later schema change is a new migration.
- **R66** Every unit test, backend and frontend, old and new, runs in under a second on the developer's Mac, because CI runs on a much slower machine. A unit test that takes longer fails. Unit tests never wait on a real network call, a real clock or a sleep.

## Testing

- **Backend (pytest, `backend/tests/`)**: each test gets a fresh temporary database and a fixed `today()`. Covered:
  - the database setting and that the default database isn't used under test; that no test reads `.env`; one transaction per request; the host check, including the Render hostname (concern 22);
  - every route but the public ones answers 401 signed out, found by walking the app's routes so a new route can't be missed (R51);
  - token checks against a key pair made in the test and served as a fake key set, with no network: a good token, an expired one, one signed with another key, one with the wrong audience or issuer, and a fetch of new keys when a token names an unknown one (concern 17);
  - local mode: the made-up teammates sign in, anyone else is refused, and the backend refuses to start local mode against a database that isn't SQLite, or Supabase mode without its settings (concern 16);
  - the `users` row is kept from the token and updated when the name changes; names and initials from a display name or an email (R55);
  - who added and last changed each record, through every way of adding or changing one, including a move on the board, marking a follow-up done and a stage-change entry (R56);
  - search: case, part of a name, a contact's full name, order and the limit of 5, short and long text, and `%`, `_` and `\` matched as themselves (R58 to R62, concern 19);
  - the migrations: a new database, an existing database from before this change keeps its data and credits it to "Sample data", and running them twice changes nothing (R65);
  - the seed refuses without "yes" against a database that isn't SQLite, using a fake URL and input so nothing is reached (R41);
  - stage probability rules (R14), the close date on won or lost (R15), stage-change logging (R19), the late flag (R16);
  - the `move` endpoint ordering (R23, R25);
  - delete rules and delete-impact counts (R4);
  - list columns, validation (422) and missing records (404);
  - each dashboard figure against hand-worked data (R31 to R38), including zero cases and week, month and year boundaries;
  - the seed's counts and spread (R40 to R42), that data survives a restart, and that an existing database emptied by the team stays empty after a restart (R5).
- **Frontend (Vitest, beside the code it tests)**: money, date and percent formatting; initials; the table's search and sort; the delete dialog, including when its counts can't load; website links; form validation; the drag-time totals and rollback in `board.ts`; the summary line; reading and saving the mode, including a missing or unknown saved value meaning system, and system following the device as it changes; the user menu's name, its items and the ticked theme; initials from a name or an email; the sign-in form's errors; the search box's states and keyboard use.
- **End to end (Playwright with installed Chrome, `e2e/`)**: Playwright starts its own backend and frontend on ports 8100 and 5180 against a temporary database with local sign-in, runs one test at a time and reseeds before each. Each test signs in as a made-up teammate through the sign-in screen, unless it's testing the signed-out state. A test fails if the browser console logs an error or the page requests anything off localhost. These flows are covered:
  - signed out, every route shows the sign-in screen and the API refuses; a wrong password shows its error; signing in opens the page that was asked for; signing out shows the sign-in screen again (R49 to R53);
  - every route loads and the rail marks the current section;
  - create, search, sort, edit and delete for each list, with refresh checks;
  - the status filter;
  - drag across and within columns, into an empty column and with the keyboard, with a refresh check, and a refused move going back;
  - add a deal in a column;
  - log an activity with a follow-up and mark it done on the dashboard;
  - the dashboard updates after a deal is won;
  - the user menu switches the theme to Dark, Light and System; the choice is still on after a reload; System follows the device's setting as it changes; a browser with no saved choice opens in System; a saved `dark` from before this change still opens dark (R6a, concern 14);
  - search finds an organization, a contact and a deal by part of a name in any case, and opens each with the mouse and with the keyboard (R58 to R61);
  - a record added in the test shows the teammate who added it, and a sample record shows "Sample data" (R57);
  - every page in light mode matches its baseline screenshot, signed in as Maya Torres with `light` saved and today's date fixed (concern 15).

  Screenshots of the dashboard and the pipeline in both modes are kept in `docs/changes/dark-mode/`.
- **The live database**, at the end of Test: with the Supabase MCP server (read-only, limited to the project), check that the tables and the migration record are there, that row-level security is on for every table, and that records added through `npm start` carry the right person.
- Tests don't replace using the app: a person goes through it in Chrome the way a real estate agent would, checking each screen by eye in both modes with the console clear, and once through `npm start`, signed in against Supabase.
