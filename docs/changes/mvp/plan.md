# Plan: building the Accountable MVP

This plan builds what `docs/spec.md` describes, for the outcome in `docs/intent.md`, on the stack in `docs/TECH_STACK.md`. Requirement IDs (R1 to R43, plus R34a) and concern numbers refer to the spec. The approved look is mockup D (`docs/mockups/d-dashboard.png` and `docs/mockups/d-pipeline.png`).

This is an MVP, so each step builds the simplest thing that meets its requirement. Nothing is added beyond the spec, except one test-only date setting (`ACCOUNTABLE_TODAY`) that the running app never uses.

The code follows the spec's code structure: grouped by area of the product, with thin routes, plain service functions and one transaction per request. Accountable can then grow into more areas, and onto Supabase, without moving what's already built.

## Files that change

Every file below is new unless it says otherwise. `README.md` stays as it is.

### Repo root

| File | What it holds |
|---|---|
| `package.json` | The npm workspace (`frontend`), the scripts below, and dev dependencies `concurrently` and `@playwright/test`. |
| `package-lock.json` | Created by npm. |
| `pyproject.toml`, `uv.lock`, `.python-version` | The Python 3.12 app. It has no build system, so uv treats it as an app rather than a package.<br>- Dependencies: FastAPI, Uvicorn and SQLAlchemy.<br>- Dev dependencies: pytest and httpx.<br>- pytest settings: `pythonpath = ["backend"]` and `testpaths = ["backend/tests"]`. |
| `playwright.config.ts` | Runs one test at a time (`workers: 1`) in the installed Google Chrome (`channel: "chrome"`). Starts its own backend and frontend on test ports (8100 and 5180), and never reuses a server that's already running. Points `ACCOUNTABLE_DATABASE_URL` at a temporary SQLite file. |
| `.gitignore` (changed) | Adds `backend/data/`. `*.db` files are already ignored. |
| `.vscode/settings.json` | Words the VS Code spell checker accepts, such as WCAG. Editor-only: the app doesn't use it. |

The npm scripts all work the same in macOS, Linux and Windows shells:

| Script | Runs |
|---|---|
| `dev` | `dev:api` and `dev:web` together through `concurrently`, with each output line labelled. Vite prints the address to open (R39). |
| `dev:api` | `uv sync`, then Uvicorn serving `app.main:app` from `backend/` on port 8000 (concern 4). |
| `dev:web` | The Vite dev server in `frontend/` on port 5173. |
| `seed` | `uv run --directory backend python -m app.seed` (R41). |
| `test` | `scripts/test-all.mjs`: pytest, the TypeScript check, Vitest, then Playwright, running every one even after a failure, then a summary. It fails if any test fails (R43). |
| `test:api` | `uv run pytest`. |
| `test:web` | The TypeScript check (`tsc --noEmit`), then `vitest run`, in `frontend/`. |
| `test:e2e` | `playwright test`. |

### Backend (`backend/app/`)

`core/` holds what every area shares. Each area has the same three files:
- `routes.py`, which is thin: it checks the request, calls the service and returns the result;
- `schemas.py`, the Pydantic models for its requests and responses;
- `service.py`, plain functions that take the request's database connection and hold the area's queries and rules.

| File | What it holds |
|---|---|
| `main.py` | Creates the FastAPI app. On startup it creates the database and seeds it if it's new (R40), then adds each area's routes. It refuses requests addressed to any host but `localhost` or `127.0.0.1`. |
| `core/config.py` | The database URL from `ACCOUNTABLE_DATABASE_URL`. The default SQLite file, `backend/data/accountable.db`, is found from this file's location rather than the folder the command runs in, and its folder is created if it's missing. Also `today()`, which tests can fix with `ACCOUNTABLE_TODAY`, and the host names the API answers to. |
| `core/errors.py` | The errors services raise for a missing record, a refused change and unusable input, turned into 404, 409 and 422 responses in one place. |
| `core/fields.py` | Field types every area's request schemas share: required and optional text, email, website, and partial updates that can't set a required field to empty. |
| `core/db.py` | The engine; `PRAGMA foreign_keys = ON` for every SQLite connection; creating the tables if they're missing; and the FastAPI dependency that opens one transaction per request and passes its connection to the routes. |
| `core/tables.py` | All four tables in one place, with their foreign keys, `on delete` rules and the activity check constraint. Timestamps are stored in UTC. |
| `organizations/` | Lists with contact and open-deal counts (R8). One organization with its contacts and deals (R9). Create, update, delete and `delete-impact` (R4, R7). |
| `contacts/` | Lists with organization name and last activity date (R11). One contact with their organization, deals and timeline, the timeline including their deals' activities (R12, concern 5). Create, update, delete and `delete-impact` (R4, R10). |
| `deals/` | `stages.py`, the only list of stages. The stages endpoint. Lists with names, expected value and late flag (R16, R17). One deal with its timeline (R18). Create, update, delete, `delete-impact` and `move`.<br>The service holds the deal rules:<br>- probability (R14);<br>- close date on win or loss (R15);<br>- positions within a column (R23, R25).<br>It calls `activities` to log stage changes (R19). |
| `activities/` | Create, update and delete, with the 409 for stage-change entries (R28, R29). Also the function that logs a stage change, and the timeline queries that contacts and deals use. |
| `dashboard/` | Every dashboard figure in R31 to R37, worked out from the database using `today()`: the follow-up groups, the zero cases, and `today` itself, so the header date and the figures always agree. |
| `seed.py` | Builds the sample data (R42) with a fixed random seed and dates relative to `today()`, including stage-change history. Run as a module, it empties the tables and refills them in one transaction (R41). It never deletes the database file, so it's safe while the app is running, including on Windows, which won't delete a file that's in use. |
| `__init__.py` files | Package markers for `app/`, `core/` and each area. |

The backend tests, in `backend/tests/`, are listed under Proof. `tests/conftest.py` gives each test a fresh temporary database, a fixed `today()`, an API client and small helpers for creating records.

### Frontend (`frontend/`)

| File | What it holds |
|---|---|
| `package.json`, `tsconfig.json`, `index.html` | The Vite, React and TypeScript app.<br>Dependencies:<br>- React Router;<br>- TanStack Query and TanStack Table;<br>- Recharts;<br>- `@dnd-kit/core` and `@dnd-kit/sortable`;<br>- React Hook Form and Zod;<br>- Radix UI (Dialog, Popover, Toast);<br>- Lucide;<br>- date-fns;<br>- the three Fontsource packages;<br>- `cmdk` for the searchable pickers.<br>Dev dependencies: Vitest, Testing Library and jsdom.<br>Scripts: `dev`, `test` and `typecheck`. |
| `vite.config.ts` | The dev server port and the `/api` proxy, both read from environment variables so the end-to-end tests can use their own ports. The Vitest settings: jsdom, and only `src/**/*.test.ts(x)`. |
| `src/main.tsx`, `src/App.tsx` | Providers (TanStack Query) and the spec's eight routes, inside the layout with the rail. |
| `src/api/client.ts` | The one fetch wrapper and its error type. After any change to data, all queries are refreshed (R38). |
| `src/ui/` | App-wide pieces that know nothing about deals or contacts:<br>- `Rail`, `PageHeader` and `Toast`;<br>- `DataTable` (search, sort and row actions; R2) and `ConfirmDeleteDialog` (R4);<br>- `EmptyState`, `LoadingState` and `ErrorState`;<br>- `Avatar`;<br>- form fields: text, select, date, and the searchable `RecordPicker`;<br>- `NotFoundPage`, for an address that matches no route. |
| `src/lib/` | `format.ts` (money, dates and percentages; R6, concern 10), `initials.ts` (initials and tint for the avatar; R20) and `validation.ts` (the same email and website checks as the backend). |
| `src/features/organizations/` | List page, detail page, `OrganizationForm`, `queries.ts`, `types.ts` and `website.ts` (how a website is linked and shown) (R7 to R9). |
| `src/features/contacts/` | List page with the status filter, detail page, `ContactForm`, `queries.ts` and `types.ts` (R10 to R12). |
| `src/features/deals/` | List page, detail page, `DealForm`, `queries.ts` (including the stages), `types.ts`, `StageChip`, `LateBadge` and `ProbabilityDots` (R13 to R18). |
| `src/features/activities/` | `Timeline`, `ActivityForm`, `queries.ts` and `types.ts` (R28 to R30). |
| `src/features/pipeline/` | The pipeline page, `Board`, `Column`, `DealCard`, `BoardSummary` and `PipelineStrip`. Also `board.ts`, pure functions for moving cards and recalculating totals while dragging, and the optimistic `move` with rollback (R20 to R27). |
| `src/features/dashboard/` | The dashboard page with `SummaryLine`, `RevenuePanel`, `FigureCards`, `Funnel`, `WonLostChart`, `FollowUps` and `RecentActivity` (R31 to R37). It uses `PipelineStrip` from the pipeline area. |
| `src/styles/` | `tokens.css` (colors, stage colors, type scale, radii and shadows from the spec) and `base.css`, with the font imports. |
| `src/test/setup.ts` | Testing Library setup for Vitest. |

The frontend tests sit next to the code they test, and are listed under Proof.

### End-to-end tests (`e2e/`)

| File | What it holds |
|---|---|
| `fixtures.ts` | Applies to every test. Before each test it reseeds the test database, by running the `seed` command against it. The test fails if the browser console logs an error, or if the page requests anything that isn't on localhost (which proves the app works offline). Also a helper that drags a card with small stepped mouse moves. |
| `*.spec.ts` | The end-to-end tests listed under Proof. Playwright files end in `.spec.ts` and Vitest files in `.test.ts(x)`, so neither runner picks up the other's tests. |

### Docs

| File | Change |
|---|---|
| `docs/spec.md` (changed) | Already updated with the Phase 0 fixes, the code structure, the database URL and UTC timestamps. Changed again only if a library has to be swapped. |
| `docs/STATUS.md` (changed) | The setup: install Node.js, uv and Google Chrome, then run `npm install` once. Then how to run the app (`npm run dev`), reset the data (`npm run seed`) and test it (`npm test`). Progress is noted at the end of each phase. |

## Order of work

Each phase ends with `npm test` passing and a short note in `docs/STATUS.md`. A phase starts only when the one before it is done.

- Every page gets its empty, loading and error states in the phase that builds it.
- New logic is written test-first wherever the Proof section lists a test for it.
- At the end of each phase, check the import rules: `core/`, `ui/` and `lib/` never import from an area.

### Phase 0: Settle the spec gaps (done)

The review of this plan found places where the spec contradicted itself or left a case open. All six were agreed on 2026-11-24 and are now in `docs/spec.md`:

1. The Closed (Won) and Lost columns are labelled "All time" (R20).
2. The board fills the window height, and each column scrolls on its own (concern 9, pipeline layout).
3. Dashboard figures with nothing to measure have their own wording, such as "No revenue won in October" and "No closed deals yet" (R32 to R34).
4. Follow-ups are in date order, oldest first, in every group (R36).
5. Contacts and organizations are chosen with `cmdk` searchable pickers (R10, R13, libraries table).
6. The spec's code structure matches this plan.

### Phase 1: A skeleton that runs

1. Root `package.json` with the workspace and every npm script. `pyproject.toml` with uv. `core/config.py` and `core/db.py`. `main.py` with `GET /api/stages`, served from `deals/`. The Vite React app.
2. Install every library the plan names now, so any clash with Node.js 26 or the current React shows up on day one.
3. Set up the folder layout from the spec, so later phases fill it in rather than invent it.
4. `npm run dev` starts both servers. The browser shows the rail on a blank page, with the stages loaded through the proxy.
5. The fonts through Fontsource, and `tokens.css`.
6. One small test in each runner, `playwright.config.ts`, and `e2e/fixtures.ts` with its console and offline checks. `npm test` runs all three and fails if any test fails (R43).

Done when: on a Mac, a fresh clone runs `npm install`, `npm run dev` and `npm test` without errors.

### Phase 2: Data, rules and API

1. `core/tables.py`, and the transaction-per-request dependency.
2. The `deals` service rules, test-first: R14, R15, R16, R19, R23 and R25.
3. The `organizations`, `contacts`, `deals` and `activities` areas:
   - their list columns;
   - `delete-impact` and the delete rules (R4);
   - `move`;
   - the 409 for stage-change entries (R29);
   - 422 for invalid input and 404 for missing records.
4. `seed.py`, the seed on first start (R40), and `npm run seed` (R41, R42).

The `dashboard` area waits until Phase 6, so it's built next to the screen that uses it.

Done when: the backend tests pass, and after `npm run seed`, the running app's `/api/deals` returns the sample deals.

### Phase 3: Frontend foundations

1. The layout, with the rail marking the current section (R1), and the page header.
2. `api/client.ts` and `lib/format.ts`.
3. The `ui/` pieces: `DataTable`, `ConfirmDeleteDialog`, `Toast`, the empty, loading and error states, `Avatar`, and the form fields, including `RecordPicker`.

Done when: the Vitest tests for formatting, the table and the delete dialog pass, and the Organizations page lists the seeded organizations through `DataTable`.

### Phase 4: Records

1. `features/organizations`: table, form, delete and detail page (R7 to R9).
2. `features/contacts`: table with the status filter, form, delete, and detail page with its timeline (R10 to R12).
3. `features/deals`: table with late badges, form (choosing a stage fills in its probability), delete and detail page (R13 to R18).
4. `features/activities`: log, edit and delete from contact and deal pages, with stage-change entries read-only (R28 to R30).

Done when: the form tests and the end-to-end tests for organizations, contacts, deals and activities pass.

### Phase 5: Pipeline

1. `board.ts` and its tests.
2. The board, columns, cards and summary (R20, R21). The board fills the window height, and each column scrolls on its own.
3. Drag and drop with dnd-kit's mouse and keyboard sensors (R22, R23, R26). Every column is a drop target, even when it's empty. The move is optimistic: if the server refuses it, the card goes back and an error shows (R24). The dragging look follows mockup D.
4. "Add deal" in a column (R25), and clicking a card to open the deal (R27).

Done when: the pipeline end-to-end tests pass, and the board matches mockup D by eye.

### Phase 6: Dashboard

1. The backend `dashboard` area, test-first, including the zero cases (R32 to R34) and the week, month and year boundaries (R31 to R38).
2. The summary line, the revenue panel with its Recharts line chart, the three figure cards (mini strip, ring and mini bar chart), the funnel, the won and lost chart (Recharts bars, with lost counts as negative values), and the pipeline strip (R31 to R35).
3. Follow-ups in their three groups, with mark-done (R36), and recent activity (R37).
4. A check that every change made anywhere in the app shows on the dashboard without a refresh (R38).

Done when: the dashboard end-to-end tests pass, and the page matches mockup D by eye.

### Phase 7: Finish and prove

1. Go over every page against the spec's writing rules and its empty, loading and error states.
2. Run `npm install` and `npm test` from a fresh clone.
3. Check `npm run dev` and `npm run seed` on Windows or Linux, or say clearly in `docs/STATUS.md` that this hasn't been done (R39).
4. The manual walkthrough for success criterion 8 (see Proof). Fix what it finds, and run `npm test` again.
5. The final run instructions and status in `docs/STATUS.md`.

## Risks

| Risk | What could go wrong | What we do about it |
|---|---|---|
| Today's date | The dashboard, late flags, follow-up groups and sample data all depend on today. Tests could pass one day and fail the next, especially around a week, month or year end. | All date logic goes through `today()`. Backend tests fix the date with `ACCOUNTABLE_TODAY`, and include a Sunday, a month end and a year end. Plain dates stay dates, and timestamps are stored in UTC and shown in local time. End-to-end tests check figures against the data they create, not against fixed totals. |
| Tests touching real data | A test run could overwrite the agent's data, either through the default database or through an `npm run dev` that's already running. | Every runner sets `ACCOUNTABLE_DATABASE_URL` to a temporary file. Playwright uses its own ports and never reuses a running server. `test_config.py` checks the default database isn't used under test. |
| End-to-end tests sharing a database | Tests running together, or one after another without a reset, change each other's data and fail at random. | One test at a time, with a reseed before each. |
| Half-saved changes | A move renumbers two columns and logs a stage change. If it fails partway, the board could be left in a muddle. | One transaction per request. `test_transactions.py` proves that a request that fails after writing leaves nothing changed. |
| Code drifting out of shape | Under deadline, logic lands in route files, or `ui/` starts importing deal code, and the structure stops paying off. | Thin routes and the import rules are in the spec, and checked at the end of every phase. |
| Library versions | Node.js 26 and the current React are new, and some libraries may lag behind, Recharts and dnd-kit most likely. | Install everything in Phase 1 and fix clashes there. If a library has to be swapped, update the spec's libraries table. |
| Drag and drop | dnd-kit waits for a few pixels of pointer movement before a drag starts, so Playwright's plain `dragTo` may not trigger it. An empty column needs its own drop target. | The stepped-drag helper, plus a keyboard drag test (R26). Each column is a drop target as well as a sortable list, and a test drags into an empty column. |
| Optimistic moves | The board shows a move before the server confirms it. If they disagree, cards could jump or totals could drift. | `board.ts` is pure and tested. After every move, the board takes the server's answer. An end-to-end test makes the server refuse a move and checks the card goes back. |
| Positions in a column | Renumbering could leave gaps or duplicates, so a card lands in the wrong place after a refresh. | Both columns are renumbered 0, 1, 2… inside the request's transaction. A backend test runs a mix of moves and checks the result. |
| SQLite foreign keys | SQLite ignores foreign keys unless each connection switches them on, so deletes wouldn't unlink or cascade. | `core/db.py` switches them on for every connection. The delete tests prove the rules. |
| Reset while running | `npm run seed` while the app is open could clash with the open database. Windows won't delete a file in use. | The seed empties and refills the tables in one transaction, and never deletes the file. |
| Dashboard with nothing to measure | After deletes, several figures could divide by zero. | The wording agreed in Phase 0 (R32 to R34), and a backend test on an empty database. |
| Charts in mockup D | Recharts may not match every detail: the dark panel, a label on each point, bars above and below a centre line. | Recharts for the line and bar charts, styled through its props. The ring, strips and funnel bars are simple SVG or CSS shapes. If a chart fights back, match the mockup's meaning before its pixels. |
| One command everywhere | `npm run dev` must work on macOS, Linux and Windows, which differ in shells, paths and working folders. | npm scripts with `concurrently` and nothing shell-specific. Paths are worked out in code, not from the working folder. Phase 7 checks a second system, or says it wasn't done. |
| Working offline | Anything loaded from the internet breaks without a connection. | Fonts from Fontsource, and every library bundled. The end-to-end fixture fails any request off localhost, and the walkthrough runs with Wi-Fi off. |
| Chrome not installed | The end-to-end tests need Google Chrome. | It's in the setup steps. Without it, the run fails with Playwright's message rather than skipping tests. |
| Scope creep | Mockup D invites extras, such as a search box in the header or filters on the board. The new structure invites extra layers. | Build only R1 to R43 and R34a. Add no layers beyond the spec's code structure. New ideas go into `docs/intent.md`'s open questions. |

## Proof

`npm test` must pass at the end of every phase. It runs the TypeScript check and all three test suites. The MVP isn't called done until the manual walkthrough has passed as well.

### Backend unit tests (pytest, `backend/tests/`)

| File | What it proves |
|---|---|
| `test_config.py` | The database comes from `ACCOUNTABLE_DATABASE_URL`. The default file is found from the backend folder whatever the working folder. The default isn't used under test. |
| `test_transactions.py` | A request that fails after writing leaves the database unchanged. |
| `test_stages.py` | `GET /api/stages` returns the seven stages in order, with the right probabilities and open flags. |
| `test_deal_rules.py` | R14 to R16 and R19:<br>- a new deal takes its stage's probability;<br>- a probability set by hand is kept until the stage changes, then replaced;<br>- a PATCH that changes the stage and sets a probability keeps that probability;<br>- moving to Closed (Won) or Lost sets the close date to today;<br>- every stage change, by PATCH or by move, logs exactly one "Moved from X to Y" entry;<br>- edits that don't change the stage, and moves within a column, log nothing;<br>- the late flag is true for open deals past their close date, and false for closed ones. |
| `test_move.py` | R23 and R25:<br>- moving to another column puts the deal at the given index;<br>- moving within a column changes only the order;<br>- an index past the end puts the deal last;<br>- a deal can move into an empty column;<br>- positions stay gap-free and unique after a run of mixed moves;<br>- a new deal goes to the top of its column;<br>- an unknown stage or a negative index returns 422. |
| `test_deletes.py` | R4:<br>- deleting an organization keeps its contacts and deals, and unlinks them;<br>- deleting a contact unlinks their deals and deletes only their own activities;<br>- deleting a deal deletes its activities, stage changes included;<br>- each `delete-impact` count matches what the delete then does. |
| `test_activities.py` | R28 to R30:<br>- an activity belongs to exactly one contact or one deal;<br>- note, call and email entries can be edited and deleted;<br>- editing or deleting a stage-change entry returns 409;<br>- a contact's timeline includes their deals' activities, newest first (concern 5);<br>- `occurred_at` is stored in UTC and comes back with its time zone. |
| `test_lists.py` | R8, R11 and R17:<br>- organizations come with their contact and open-deal counts;<br>- contacts with their organization name and last activity date;<br>- deals with their contact and organization names, expected value and late flag. |
| `test_validation.py` | R3, R7, R10 and R13: missing required fields, negative values, probabilities outside 0 to 100, and unknown stages, statuses or industries return 422. Missing records return 404. |
| `test_dashboard.py` | R31 to R38, on a small hand-built dataset with today fixed:<br>- revenue won this month, and the change from last month;<br>- the six-month total and the best month;<br>- open value, expected revenue and the expected share;<br>- deals won this month and last month, and the win rate;<br>- the monthly won and lost counts;<br>- the funnel's counts, values and conversion shares, from each deal's furthest stage (concern 8);<br>- the follow-up groups in date order, with done ones left out, including when today is a Sunday;<br>- the latest 10 activities;<br>- the summary line's counts.<br>Also: figures change after a deal is won or a follow-up is added; months are right across a year end; an empty database gives zeros and the agreed wording for figures with nothing to measure, without errors. |
| `test_seed.py` | R40 to R42:<br>- a new database is seeded on first start;<br>- `seed` resets the data, even while the app holds the database open;<br>- there are about 12 organizations, 40 contacts, 30 deals and 80 activities;<br>- every status and stage appears;<br>- there are deals won and lost in each of the last six months, 3 or 4 late deals, and follow-ups both overdue and due soon;<br>- deals past New Lead have stage-change history;<br>- every email uses a reserved domain such as `example.com`;<br>- two runs give the same data. |
| `test_persistence.py` | Data written through the API is still there when a new app instance opens the same database, which is what a restart does (R5, success criterion 2). |
| `test_hosts.py` | The API answers requests addressed to `localhost` or `127.0.0.1`, and refuses any other host with 400, so a web page can't reach it through DNS rebinding. |

### Frontend unit tests (Vitest, `frontend/src/`)

| File | What it proves |
|---|---|
| `lib/format.test.ts` | Money as `$485,000`, and in short form as `$612K`, `$1.2M` and `$10.2M`. Dates as `Nov 23, 2026`, and a timestamp's date in local time even when its UTC date differs. Percentages as `60%` (R6, concern 10). |
| `lib/initials.test.ts` | Initials come from the contact, then the organization, then none. The same name always gets the same tint (R20). |
| `ui/DataTable.test.tsx` | Search filters across text columns. Clicking a heading sorts ascending, then descending, then back to the default order (R2). |
| `ui/ConfirmDeleteDialog.test.tsx` | The dialog shows the impact counts and leaves out zero counts. When the counts can't be loaded, it says so, keeps Delete disabled and offers to try again (R4). |
| `features/deleteDialogs.test.tsx` | The organization, contact and deal delete dialogs each show the error when their counts can't be loaded (R4). |
| `features/contacts/ContactsPage.test.tsx`, `features/deals/DealsPage.test.tsx` | The last activity shows the local day it happened. Search matches a contact's status and a deal's stage (R2, R11). |
| `features/organizations/website.test.ts` | A website links to itself when it has a scheme in any case, and gets `https://` otherwise, even when it starts with "http". |
| `features/pipeline/PipelineBoard.test.tsx` | Each column's Add deal button is named after its stage. Every card shows its probability, closed deals included (R20, R25). |
| `features/*/…Form.test.tsx` | Required fields and invalid emails or websites show errors next to the field. Choosing a stage in the deal form fills in its usual probability, and a typed probability is kept (R3, R14). |
| `features/pipeline/board.test.ts` | Moving a card across columns, within one, or into an empty column gives the right order. Column totals, expected revenue, board totals and the late count update straight away. Moving a late deal to Closed (Won) clears its late flag. A rollback restores the board exactly (R21, R24). |
| `features/dashboard/SummaryLine.test.tsx` | Parts that would be zero are left out (R31). |

The TypeScript check runs before these tests, so a type error fails `npm test` too.

### End-to-end tests (Playwright with installed Chrome, `e2e/`)

Every test starts from freshly seeded test data. It fails if the console logs an error, or the page requests anything outside localhost.

| File | What it proves |
|---|---|
| `navigation.spec.ts` | The app opens on the dashboard with sample data. The rail reaches all five sections and marks the current one. Every route loads (R1, success criterion 1). |
| `organizations.spec.ts` | Add, search, sort, edit and delete an organization. Saving closes the form and shows a confirmation. The detail page lists its contacts and deals. The delete dialog shows counts, and the linked contacts are still there after the delete. Changes survive a refresh (R2 to R5, R7 to R9). |
| `contacts.spec.ts` | Add, search, sort, edit and delete a contact, choosing its organization from the searchable list. The status filter works together with search. The detail page shows the organization link, their deals and their timeline (R10 to R12). |
| `deals.spec.ts` | Add, search, sort, edit and delete a deal. Changing its stage in the form updates its probability and adds a stage-change entry to its timeline. Late deals show the Late badge (R13 to R19). |
| `activities.spec.ts` | Log a call with a follow-up date on a contact, and a note on a deal. Each appears first in its timeline. Edit one and delete one. Stage-change entries have no edit or delete actions (R28 to R30). |
| `pipeline.spec.ts` | Drag a card to another column with the mouse: its stage and probability change in the deals list, and the column and board totals change straight away. Also:<br>- drag a card higher in its own column;<br>- move a card with the keyboard;<br>- drag a card into an empty column;<br>- all these moves are still there after a refresh;<br>- when the server refuses a move, the card goes back and an error shows;<br>- a deal added in a column starts at that stage, at the top;<br>- clicking a card opens the deal.<br>(R20 to R27.) |
| `dashboard.spec.ts` | Every part of the dashboard renders. Moving a deal to Closed (Won) raises revenue won this month and adds a stage change to recent activity. A new follow-up appears in the right group, and marking it done removes it. Clicking the strip opens the pipeline (R31 to R38, success criterion 6). |

### Manual walkthrough (success criterion 8)

Before the MVP is called done, someone uses it the way an agent would, in Chrome with Wi-Fi off:
- Start it with `npm run dev`.
- Go through every section and every action in R1 to R38.
- Stop the app and start it again, and check that every change is still there.
- Run `npm run seed` and check that the sample data is back.
- Tab through each page, and move a pipeline card using only the keyboard.
- Compare the dashboard and pipeline with mockup D at 1280px and 1600px wide.
- Keep the console open throughout, and check it stays clear.

What was checked, and anything left open, goes in `docs/STATUS.md`.
