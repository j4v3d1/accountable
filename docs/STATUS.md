# Status

## Setup (once)

1. Install [Node.js](https://nodejs.org) 24 or later, [uv](https://docs.astral.sh/uv/getting-started/installation/), [Google Chrome](https://www.google.com/chrome/) and [gitleaks](https://github.com/gitleaks/gitleaks#installing) (for `npm run check`).
2. In this folder, run `npm install`.

## Everyday commands

- `npm run dev` starts Accountable. Open the address it prints (http://localhost:5173).
- `npm run seed` resets the data to the sample data.
- `npm test` runs every test: backend (pytest), frontend (TypeScript check and Vitest) and end to end (Playwright in Chrome). It runs all of them even when one fails, prints a summary, and fails if any test fails. The tests use their own database and ports, so they never touch your data.
- `npm run check` runs every check: formatting, linting, complexity, type checks, the secrets scan and `npm test` with at least 80% unit test coverage. `npm run check:quick` leaves out the end-to-end tests. `npm run format` fixes the formatting.

## History

- Intent, spec, mockups and plan agreed: see `docs/changes/mvp/intent.md`, `docs/spec.md`, `docs/mockups/` (mockup D is the approved look) and `docs/changes/mvp/plan.md`. Phase 0 settled the spec gaps found while planning.
- Docs reorganized for future changes (2026-11-24, `harness` branch): the MVP's intent and plan moved to `docs/changes/mvp/`, and each change now gets its own `docs/changes/<branch name>/` folder. `docs/spec.md` now describes the whole product as it stands, with the problem statement, users, what's not built yet, and behavior the MVP added during the build (Edit, Delete and Back on record pages, the not-found page, the dashboard's "Log activity" picker, the delete dialog's retry). No code changed.

## Build progress

- **Phase 1, skeleton (done):** npm workspace with every script, uv project (Python 3.12, FastAPI, SQLAlchemy), the backend's `core/` (database URL, `today()`, engine, one transaction per request) and `GET /api/stages`. The Vite React app with the rail, the spec's eight routes, fonts from Fontsource and the brand tokens. Every library in the plan is installed. Playwright runs its own servers on ports 8100 and 5180 against a temporary database, and fails a test on any console error or request off localhost. `npm test` runs all three suites.
- **Phase 2, data, rules and API (done):** the four tables (foreign keys on, UTC timestamps, the one-owner check on activities), the organizations, contacts, deals and activities APIs with every rule in the spec: stage probabilities, close date on win or loss, the late flag, stage-change entries, positions within a column, `move`, delete rules with `delete-impact`, 409 for stage-change entries, 422 and 404. `seed.py` builds the sample data for the fictional Cedar Bay metro (12 organizations, 40 contacts, 30 deals, 80 activities plus stage-change history), relative to today; a new database is seeded on first start, and `npm run seed` resets it. 158 backend tests.
- **Phase 3, frontend foundations (done):** the layout and rail, `PageHeader`, the API client (every change refreshes all queries), money/date/percent formatting, avatars, and the `ui/` pieces: `DataTable` (search across text columns, sort ascending, descending, then back; edit and delete on each row; click a row to open it), `ConfirmDeleteDialog` (impact counts, zero counts left out), toasts, form fields, the `cmdk` `RecordPicker`, and empty, loading and error states. The Organizations page lists the seeded organizations.
- **Phase 4, records (done):** organizations, contacts and deals each have a list page (search, sort, add, edit, delete), a form in a dialog and a record page; contacts have the status filter; deals have stage chips, late badges and the stage-fills-probability form; contact and deal pages have the timeline, where note, call and email entries can be logged, edited and deleted, and stage changes are read-only. 44 frontend unit tests, 12 end-to-end tests.
- **Phase 5, pipeline (done):** the board with seven columns (count, total value, expected revenue and share bar for open stages; "All time" on Closed (Won) and Lost), cards (avatar, value, five-dot probability, close date or Late), and the summary (open value, expected revenue, late count, strip of open value by stage). Cards drag with the mouse or the keyboard (Space, arrow keys, Space), into any place in any column, including empty ones; totals change at once, the server's answer replaces the board, and a refused move puts the card back with an error. "Add deal" in a column starts the deal at that stage, at the top; clicking a card opens the deal. Checked by eye against mockup D at 1600px, including the tilted card and hatched gap while dragging.
- **Phase 6, dashboard (done):** `GET /api/dashboard` works out every figure from the current data and today (summary line, revenue this month and the change from last month, six-month total and best month, open value and expected revenue, deals won and the win rate, the funnel from each deal's furthest stage, won and lost by month, follow-ups in three groups, recent activity), with zero cases and week, month and year boundaries tested. The page has the summary line, the Midnight revenue panel with its line chart, the three figure cards, the funnel, the won and lost chart, the pipeline strip (opens the Pipeline), follow-ups with mark-done, and recent activity. "Log activity" on the dashboard asks for the contact or deal first. Any change elsewhere refreshes it. Checked by eye against mockup D at 1600px and 1280px.
- **Phase 7, finish and prove (done):** a fresh copy of the project ran `npm install` and `npm test` cleanly on a Mac (178 backend, 72 frontend and 26 end-to-end tests now). Every page was checked against the spec's writing rules and its empty, loading and error states. Then the manual walkthrough in Chrome:
  - every section and every action in R1 to R38, with each change showing on the dashboard without a refresh;
  - restarting the backend keeps every change, and `npm run seed` brings the sample data back, even while the app is running;
  - tabbing through every page shows where the focus is, and a pipeline card moves using only the keyboard;
  - the dashboard and pipeline match mockup D at 1280px and 1600px;
  - the console stayed clear, and the browser asked for nothing outside the computer.

  The walkthrough found four small things, now fixed: "None yet" and "No closed deals yet" were set in the figure font; every "Mark done" button, and every column's "Add deal" button, had the same name for screen readers; and form dialogs read their title twice to screen readers.
- **Mockup check (done):** the dashboard and pipeline were compared with mockup D at its own sizes (1600 by 1066 and 1600 by 1461) using Playwright, measured against the mockup's HTML. Fixed to match:
  - page titles had a tighter line height, so every header sat 8px higher;
  - the revenue chart now has the mockup's two guide lines, a line from each point down to the axis, and the current month as a larger solid dot with a white label;
  - the won and lost bars are rounded on every corner and stop just short of the centre line, with lost counts in Coral;
  - the pipeline summary's figures are spaced as in the mockup;
  - each follow-up's deal or contact is muted until pointed at;
  - notes and stage changes use the mockup's icons.

  Still different on purpose, as agreed in Phase 0: the board fills the window and each column scrolls, and Closed (Won) and Lost say "All time" rather than "Last 6 months". Since the review, Closed (Won) and Lost cards also show their probability, as R20 asks, where mockup D leaves it out.

## Review findings (2026-11-24)

The `mvp` branch was reviewed against `main` using `docs/REVIEW.md`. `npm test` passed before the review (178 backend, 72 frontend and 26 end-to-end tests). Seven of the eight findings are fixed, each with a test written first and watched failing. `npm test` now passes with 185 backend, 85 frontend and 26 end-to-end tests. What the review found:

**Important (blocks the merge)**

1. **Contacts table shows the wrong day for evening activities.** The "Last activity" column cut the date off the UTC timestamp instead of showing the local date. A call logged at 7:30pm on Nov 23 in New York (stored as `2026-11-24T00:30:00Z`) showed as Nov 24, while the contact's timeline said Nov 23. **Fixed:** the column shows the timestamp's local date (`formatTimestampDate` in `lib/format.ts`).

**Bugs**

2. **The delete dialog hangs when the counts can't be loaded.** If `delete-impact` failed (server down, or the record already deleted elsewhere), the dialog said "Checking linked records..." forever, with Delete disabled and no error. **Fixed:** the dialog says "Couldn't check linked records" with the reason, keeps Delete disabled, and has a "Try again" button.
3. **Some website links break.** A bare domain starting with "http" (such as `httpie.io`) was treated as already having a scheme, so it became a link inside the app. An uppercase `HTTPS://` got a second scheme added. **Fixed:** `features/organizations/website.ts` checks for `http://` or `https://` in any case.

**Security**

4. **The API answers requests for any host name.** Uvicorn on port 8000 didn't check the `Host` header, so a malicious web page could reach the local API with DNS rebinding. Low risk for a local app, but cheap to close. **Fixed:** the API refuses any host but `localhost` and `127.0.0.1` with 400. Checked on a running server as well as in `test_hosts.py`. When the app is deployed to Render, its address has to be added to `ALLOWED_HOSTS` in `core/config.py`.

**Differences from the spec and plan**

5. **Search skipped some text columns (R2).** The Deals search didn't match the stage, and the Contacts search didn't match the status. **Fixed:** both are searched. Stages still sort in pipeline order.
6. **Closed (Won) and Lost cards hid the probability (R20).** R20 says every card shows it. Mockup D hides it too, but the spec says the requirements decide what a screen does. **Fixed:** every card shows the five-dot meter and the percentage.
7. **Files not listed in the plan:** `backend/app/core/errors.py`, `backend/app/core/fields.py`, `frontend/src/ui/NotFoundPage.tsx` and `.vscode/settings.json`. **Fixed:** all four are kept and now listed in `docs/changes/mvp/plan.md`, along with `lib/validation.ts`. `errors.py` and `fields.py` are also in the spec's code structure.
8. **The walkthrough with Wi-Fi off hasn't been done** (see Not checked below). **Still open:** it needs a person to switch Wi-Fi off, run `npm run dev` and go through every screen.

## Not checked

- **Linux and Windows (R39).** Only a Mac was available. The scripts avoid shell-specific commands, and paths are worked out in code, but `npm run dev` and `npm run seed` haven't been run on either system.
- **With Wi-Fi switched off.** The walkthrough couldn't turn off the network. Instead, every end-to-end test fails if the page requests anything outside the computer, and none did during the walkthrough.
- `npm install` notes that `fsevents` (a Mac file-watching helper) has an install script that npm didn't run. This is harmless: the app and its tests run without it.

## Checks (2026-11-24, `harness` branch)

`npm run check` and `npm run check:quick` added (see `docs/changes/harness/`). What the checks found is fixed, with no rule weakened and no disable or ignore comments:

- **Formatting:** Prettier and `ruff format` applied across the frontend and backend.
- **Backend (ruff and ty):** a typed `insert_row` helper in `core/db.py` for new ids; stage keys declared once as a `Literal` in `deals/stages.py`, with a test that they match the stages; typed rows in the dashboard service; `seed.py`'s `load` split into short functions (same seed output, checked row by row); small rule fixes such as `itertools.pairwise`.
- **Frontend (ESLint):** `ContactForm`, `DealForm` and `SummaryLine` brought under the complexity limit by moving the starting values and the summary's clauses into helpers; pipeline cards state their `role="button"` and tab stop; `ActivityForm` uses `useWatch`.
- **Coverage:** frontend unit test coverage went from 47% to 99% with 172 new behavior tests, most of them rendering the whole app against a fake API (`src/test/renderApp.tsx`). Backend coverage is 98%.

`npm run check` passes: 186 backend, 257 frontend and 26 end-to-end tests.

## Hooks (2026-11-24, `harness` branch)

- **Git pre-commit (lefthook):** `npm install` installs it. It formats the staged files (Prettier, `ruff format`) and stages the fixes, then runs ESLint, `ruff check`, `tsc`, `ty` and gitleaks on the staged changes, in about 3 seconds. No tests. Tested with `lefthook run pre-commit`: badly formatted files came back formatted and staged; a type error, an unused import and a fake GitHub token each failed their check; a real `git commit` with a `debugger` statement was refused and made no commit.
- **Claude Code, end of turn:** runs `npm run check:quick` (about 25 seconds) and sends failures back to the agent. It blocks once, then lets the agent stop. Tested by piping input to the script: a clean tree passed (exit 0), a type error blocked with the tsc error and the summary (exit 2), and `stop_hook_active: true` let it through without running anything.
- **Claude Code, `.env` guard:** refuses Edit, Write, MultiEdit and NotebookEdit on `.env` and `.env.*` (not `.env.example`). Tested by piping input to the script and by a live Write to `.env.hooktest`, which Claude Code refused. It doesn't stop shell commands (such as `echo > .env`) from writing the file.

## CI (2026-11-24, `harness` branch)

`.github/workflows/ci.yml` runs one job, `check`, on every push to any branch: it installs gitleaks 8.30.1 (checksum checked) and scans the files and full history first, then installs Node 26 and uv (`astral-sh/setup-uv@v10.4.0`, latest uv) and runs `npm run check` with the runner's Google Chrome. On failure it uploads `playwright-report/` and `test-results/`. No secrets. Playwright now also writes an HTML report to `playwright-report/` (git-ignored, never opens by itself). Checked locally with actionlint, by running the gitleaks download and checksum steps, and by running the end-to-end tests to see the report appear. Not yet run on GitHub.

## Improving the harness (2026-11-24, `harness` branch)

`docs/IMPROVE.md` added: at Deploy, after the review fixes and before the merge, look at what went wrong, turn repeated mistakes into rules or checks, remove what is out of date, and improve the file itself. `AGENTS.md` points to it.
