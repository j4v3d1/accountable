# Running, checks and tests

How Accountable is started, seeded, tested and checked, and the hooks, CI and subagents around it. Part of the spec; the summary and index are in `docs/spec.md`.

## Concerns

- **4. Setup before the one command.** `npm run dev` needs Node.js and uv installed, and `npm install` run once. `docs/STATUS.md` lists these setup steps. `npm run dev` runs `uv sync` itself before it starts the backend, so there's no separate Python step.
- **15. Proving light mode hasn't changed.** Moving every color into tokens touches most style files, so a Playwright visual test compares each page in light mode with screenshots taken before the change, with the toggle hidden. Dates in the sample data and on screen follow today, so the visual test fixes today's date in both the backend and the browser. Screenshots differ slightly between Mac and Linux, so there's a Mac baseline and a Linux baseline. `npm run check` on a Mac compares against the Mac one. CI no longer runs the end-to-end tests (R47), so the Linux baselines are kept but nothing compares against them.

## Requirements

- **R39** `npm run dev` starts the backend and the frontend together and prints the address to open. It works on Mac, Linux and Windows.
- **R40** When the database file doesn't exist, the backend creates it and fills it with the sample data.
- **R41** `npm run seed` deletes everything and loads the sample data again. It's safe to run while the app is running.
- **R42** The sample data is set in Cedar Bay, a fictional US metro area, so every screen looks alive the first time the app starts:
  - 12 organizations across the industries in R7;
  - 40 contacts at every status;
  - 30 deals at every stage, including deals won and lost over the past six months, open deals closing in the months ahead, and 3 or 4 late deals;
  - 80 activities, with follow-ups both overdue and due soon, plus stage-change history for deals past New Lead.

  All dates are worked out relative to the day the seed runs, so the data never looks stale. Names are invented and use reserved domains such as `example.com`. The data is built from a fixed random seed, so every reset gives the same result.
- **R43** `npm test` runs the pytest tests, the TypeScript check, the Vitest tests and the Playwright tests, against a database and ports of their own. It runs all four even when one fails, prints a summary, and fails if any of them fails. It also fails when the backend's or the frontend's unit tests cover less than 80% of their code.
- **R44** `npm run check` runs every check and fails if any of them fails: Prettier and ESLint (recommended TypeScript, React Hooks and accessibility rules) for the frontend, `ruff format` and `ruff check` for the backend, a cyclomatic complexity of at most 15 per function (ESLint's `complexity`, ruff's `C901`), `tsc` for the frontend and `ty` for the backend, gitleaks across the working files and the git history (the git-ignored `.env` is allowed), and `npm test`. `npm run check:quick` runs the same checks without the end-to-end tests. `npm run format` fixes the formatting.
- **R45** A git pre-commit hook (lefthook, installed by `npm install`) formats the staged files with Prettier and `ruff format` and stages the result, then runs ESLint, `ruff check`, `tsc`, `ty` and gitleaks on the staged changes. It skips the tests so commits stay quick, and refuses the commit if any of them fails.
- **R46** Claude Code hooks in `.claude/settings.json`: when the agent finishes a turn, `npm run check:quick` runs and any failure is sent back to the agent to fix. It blocks the stop once, then lets the agent stop, so it can't loop. The agent can't write or edit `.env` or `.env.*` files (`.env.example` is allowed).
- **R47** GitHub Actions (`.github/workflows/ci.yml`) runs one job, `check`, on every push to any branch. It installs gitleaks and scans the working files and the whole git history first, so a leaked secret fails the run straight away. Then it installs Node and uv and runs `npm run check:quick`: every check except the end-to-end tests and the baseline check, which run only locally with `npm run check`. The workflow uses no secrets.
- **R48** Two Claude Code subagents in `.claude/agents/`, both on Sonnet. `reviewer` reviews a branch's changes against `docs/REVIEW.md` and reports findings by severity (Important, other findings, at most five nits); it can read files and run commands that only read, such as `git diff`, `git log` and `git show`, and changes nothing. `ui-check` opens each page of the running app (`npm run dev`) with the Playwright MCP server in light and dark mode, screenshots it into `.playwright-mcp/` (git-ignored), checks it against the brand skill and this spec, and reports anything broken or off-brand; it has no tools to change files.

## Testing

- **Backend (pytest, `backend/tests/`)**: each test gets a fresh temporary database and a fixed `today()`. Covered:
  - the database setting and that the default database isn't used under test; one transaction per request; the host check;
  - stage probability rules (R14), the close date on won or lost (R15), stage-change logging (R19), the late flag (R16);
  - the `move` endpoint ordering (R23, R25);
  - delete rules and delete-impact counts (R4);
  - list columns, validation (422) and missing records (404);
  - each dashboard figure against hand-worked data (R31 to R38), including zero cases and week, month and year boundaries;
  - the seed's counts and spread (R40 to R42), and that data survives a restart (R5).
- **Frontend (Vitest, beside the code it tests)**: money, date and percent formatting; initials; the table's search and sort; the delete dialog, including when its counts can't load; website links; form validation; the drag-time totals and rollback in `board.ts`; the summary line; reading and saving the mode, including a missing or unknown saved value; the dark mode button's name and pressed state.
- **End to end (Playwright with installed Chrome, `e2e/`)**: Playwright starts its own backend and frontend on ports 8100 and 5180 against a temporary database, runs one test at a time and reseeds before each. A test fails if the browser console logs an error or the page requests anything off localhost. These flows are covered:
  - every route loads and the rail marks the current section;
  - create, search, sort, edit and delete for each list, with refresh checks;
  - the status filter;
  - drag across and within columns, into an empty column and with the keyboard, with a refresh check, and a refused move going back;
  - add a deal in a column;
  - log an activity with a follow-up and mark it done on the dashboard;
  - the dashboard updates after a deal is won;
  - the dark mode button switches the page to dark and back, and dark mode is still on after a reload (R6a);
  - every page in light mode matches its baseline screenshot, with the toggle hidden and today's date fixed (concern 15).

  Screenshots of the dashboard and the pipeline in both modes are kept in `docs/changes/dark-mode/`.
- Tests don't replace using the app: a person goes through it in Chrome the way a real estate agent would, checking each screen by eye in both modes with the console clear.
