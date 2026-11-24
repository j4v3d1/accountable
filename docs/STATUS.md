# Status

## Setup (once)

1. Install [Node.js](https://nodejs.org) 24 or later, [uv](https://docs.astral.sh/uv/getting-started/installation/) and [Google Chrome](https://www.google.com/chrome/).
2. In this folder, run `npm install`.

## Everyday commands

- `npm run dev` starts Accountable. Open the address it prints (http://localhost:5173).
- `npm run seed` resets the data to the sample data.
- `npm test` runs every test: backend (pytest), frontend (TypeScript check and Vitest) and end to end (Playwright in Chrome). The tests use their own database and ports, so they never touch your data.

## History

- Intent, spec, mockups and plan agreed: see `docs/intent.md`, `docs/spec.md`, `docs/mockups/` (mockup D is the approved look) and `docs/plan.md`. Phase 0 settled the spec gaps found while planning.

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

## Not checked

- **Linux and Windows (R39).** Only a Mac was available. The scripts avoid shell-specific commands, and paths are worked out in code, but `npm run dev` and `npm run seed` haven't been run on either system.
- **With Wi-Fi switched off.** The walkthrough couldn't turn off the network. Instead, every end-to-end test fails if the page requests anything outside the computer, and none did during the walkthrough.
- `npm install` notes that `fsevents` (a Mac file-watching helper) has an install script that npm didn't run. This is harmless: the app and its tests run without it.
