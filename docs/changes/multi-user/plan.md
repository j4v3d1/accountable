# Plan: sign-in, search and a user menu

How the change in `intent.md` gets built. The product as it will be is already written in `docs/spec.md` and the area files (`sign-in.md`, `search.md`, `shared.md`, `running.md`, `architecture.md`, `visual-design.md`); this plan says which files change, in what order, what could go wrong, and how each part is proved.

## Files that change

The files are grouped into seven parts. Each file belongs to exactly one part, so each part can be built by a different agent without two of them editing the same file. Where one part needs something from another (a table, a dependency, a component), it imports it; it never edits the other part's files.

A few files wire the parts together: `backend/app/main.py`, `frontend/src/App.tsx` and `frontend/src/ui/TopBar.tsx`. Each is owned by one part, and that part's agent adds each wiring line once the other part's code exists (the search router in Phase 2, the search box and user menu in Phases 2 and 3).

### Part 1: Backend platform (database, migrations, sign-in checks)

| File | Change |
|---|---|
| `pyproject.toml`, `uv.lock` | Add `alembic`, `psycopg[binary]` and `pyjwt[crypto]` (case below) |
| `backend/alembic.ini` (new) | Alembic settings; the URL comes from `config.database_url()`, never from this file |
| `backend/migrations/env.py` (new) | Runs migrations on the app's engine; turns on row-level security on Postgres only |
| `backend/migrations/versions/0001_baseline.py` (new) | The four tables as they are today (R65) |
| `backend/migrations/versions/0002_users_and_who_added.py` (new) | `users`, the `sample-data` person, `created_by` / `updated_by` on organizations, contacts, deals and activities, every existing row credited to `sample-data` (concern 18), row-level security on every table including `alembic_version` (concern 20) |
| `backend/app/core/config.py` | Read `DATABASE_URL` (renamed from `ACCOUNTABLE_DATABASE_URL`), turning `postgresql://` into `postgresql+psycopg://`; `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `ACCOUNTABLE_AUTH`; `allowed_hosts()` with `RENDER_EXTERNAL_HOSTNAME` (concern 22); refuse local mode on a non-SQLite database and Supabase mode without its settings, naming what's missing (concern 16) |
| `backend/app/core/db.py` | `run_migrations(engine)`, stamping an existing pre-Alembic database at the baseline first; `create_tables` removed |
| `backend/app/core/tables.py` | `users` table, `created_by` / `updated_by` columns |
| `backend/app/core/auth.py` (new) | Token checks: Supabase via the JWKS keys, fetched once and again only for an unknown `kid` (concern 17); local tokens signed with a key made at startup (R54); upserts the person into `users` only when their name or email changed (R55); the `CurrentUser` dependency services receive |
| `backend/app/core/errors.py` | 401 error |
| `backend/app/account/__init__.py`, `routes.py`, `service.py` (new) | `GET /api/config`, `GET /api/health`, `GET /api/me`, `POST /api/auth/local` (local mode only, 404 otherwise) |
| `backend/app/main.py` | Migrations instead of `create_all`; seed when there are no records at all (R40); sign-in required on every router but the public ones; serve the built frontend with an `index.html` fallback outside `/api/`; host check from `allowed_hosts()`; includes the search router in Phase 2 |
| `backend/app/seed.py` | Credit the sample data to `sample-data`; keep `users` on reset (R41); against a non-SQLite database, print the host and wait for "yes" (R41) |
| `backend/tests/conftest.py` | `DATABASE_URL`, `ACCOUNTABLE_AUTH=local`, a signed-in client by default (Maya Torres), a signed-out client, a second teammate, and a fake JWKS key set made once per session |
| `backend/tests/test_config.py`, `test_hosts.py`, `test_seed.py`, `test_persistence.py`, `test_transactions.py` | Follow the renamed setting and the migrations; Render hostname; the seed's "yes" check |
| `backend/tests/test_auth.py`, `test_account.py`, `test_migrations.py`, `test_signed_out.py` (new) | See Proof |
| `backend/migrations/script.py.mako` (new, added in the build) | The template `alembic revision` uses for the next migration |
| `backend/app/account/schemas.py` (new, added in the build) | The account endpoints' response shapes, as in the other areas |
| `backend/tests/test_frontend_files.py` (new, added in the build) | The built frontend and its `index.html` fallback, signed out; unknown `/api/` addresses stay 404 |

Added in the build: `errors.py` also has a 503 for when Supabase's keys can't be fetched, so a network blip doesn't sign anyone out. `create_app(seed_if_empty=False)` lets tests start with a database that has no records, since R40 now seeds any such database. `conftest.py` fails any test whose setup and run take a second or more (R66). A new row's `updated_at` defaults to its `created_at` (`tables.py`), and renumbering a column keeps `updated_at` (`deals/service.py`), so "Last changed by" means a real change. Row-level security is turned on in `0002`, not `env.py`, so each migration turns it on for the tables it adds (concern 20). The seed test runs `seed.main()` in the test's process rather than a subprocess, to stay under a second.

### Part 2: Backend who-added-it in every area

| File | Change |
|---|---|
| `backend/app/organizations/routes.py`, `schemas.py`, `service.py` | Take `CurrentUser`; set `created_by` and `updated_by` on add, `updated_by` on edit; return `created_by_name`, `updated_by_name`, `created_at`, `updated_at` |
| `backend/app/contacts/routes.py`, `schemas.py`, `service.py` | Same |
| `backend/app/deals/routes.py`, `schemas.py`, `service.py` | Same, plus `move` sets `updated_by`, and the stage-change entry is added by whoever changed the stage (R56) |
| `backend/app/activities/routes.py`, `schemas.py`, `service.py` | Same, including marking a follow-up done; timeline entries carry `created_by_name` |
| `backend/app/dashboard/routes.py`, `schemas.py`, `service.py` | Recent activity carries `created_by_name`; routes take `CurrentUser` |
| `backend/tests/test_lists.py`, `test_activities.py`, `test_deal_rules.py`, `test_move.py`, `test_deletes.py`, `test_validation.py`, `test_dashboard.py`, `test_stages.py` | Keep passing with the signed-in client; assert the new fields where the area adds them |
| `backend/tests/test_who_added.py` (new) | See Proof |
| `backend/app/core/added_by.py` (new, added in the build) | The who-added values to save and the joins for the two names, shared by the four areas |

The dashboard routes need no `CurrentUser`: every router but the public one is included with the sign-in dependency in `main.py`, and the dashboard writes nothing.

### Part 3: Frontend sign-in and the app shell

| File | Change |
|---|---|
| `frontend/package.json`, `package-lock.json` | Add `@supabase/supabase-js` and `@radix-ui/react-dropdown-menu` (case below). This part owns the lock file, so it adds both |
| `frontend/src/features/auth/SignInPage.tsx`, `auth.css` (new) | The sign-in screen (R49, R50, R54) |
| `frontend/src/features/auth/session.ts` (new) | One session interface with two backings: Supabase (sign in, renew, sign out with supabase-js) and local (`POST /api/auth/local`, token in `localStorage`); chosen from `/api/config` |
| `frontend/src/features/auth/RequireSignIn.tsx` (new) | Shows the sign-in screen at the same address when signed out; "Your session ended. Sign in again." after a 401 (R52) |
| `frontend/src/features/auth/queries.ts`, `types.ts` (new) | The config and me queries |
| `frontend/src/api/client.ts` | Adds the bearer token; on a 401, clears the query cache and signs out (R52) |
| `frontend/src/main.tsx`, `App.tsx` | Session provider; routes wrapped in `RequireSignIn` |
| `frontend/src/ui/AppLayout.tsx`, `layout.css` | Rail, then a column with the top bar over the page |
| `frontend/src/ui/TopBar.tsx`, `TopBar.test.tsx` (new) | The 64px top bar (visual-design.md); places `SearchBox` in Phase 2 and `UserMenu` in Phase 3 |
| `frontend/src/lib/initials.ts` | Initials from a display name or an email (R55) |
| `frontend/vite.config.ts` | No change expected; listed so nobody else edits it |
| Tests beside the code: `SignInPage.test.tsx`, `session.test.ts`, `RequireSignIn.test.tsx`, `client.test.ts`, `client.errors.test.ts`, `App.test.tsx`, `initials.test.ts`, `src/test/renderApp.tsx` (renders signed in by default) | See Proof |

As built: `RequireSignIn` wraps the routes in `App.tsx`, so `main.tsx` doesn't change. `client.ts` gets the token through `configureAuth`, which the session sets, so `api/` imports no area. `TopBar` and `AppLayout` take the search box and the user menu as props from `App.tsx`, so `ui/` imports no area either. `frontend/package.json` gains a `build` script for `npm start` and Render. `vite.config.ts` sets `testTimeout: 1000`, so a unit test that takes a second fails (R66).

### Part 4: Frontend who-added-it display

| File | Change |
|---|---|
| `frontend/src/ui/AddedBy.tsx`, `AddedBy.test.tsx` (new) | "Added by Maya Torres on Nov 3, 2026" and "Last changed by..." (R57) |
| `frontend/src/features/organizations/OrganizationPage.tsx`, `types.ts` | `AddedBy` at the bottom of the details panel |
| `frontend/src/features/contacts/ContactPage.tsx`, `types.ts` | Same |
| `frontend/src/features/deals/DealPage.tsx`, `types.ts` | Same |
| `frontend/src/features/activities/Timeline.tsx`, `types.ts`, `activities.css` | The name after each entry's date |
| `frontend/src/features/dashboard/RecentActivity.tsx`, `types.ts`, `dashboard.css` | The name after each entry's date |
| `OrganizationPage.test.tsx`, `ContactPage.test.tsx`, `DealPage.test.tsx`, `Timeline.test.tsx`, `DashboardPage.test.tsx` | Fixtures gain the new fields; assert the lines |

### Part 5: Running, deploying and the end-to-end harness

| File | Change |
|---|---|
| `package.json` | `dev:api` sets `ACCOUNTABLE_AUTH=local` and never reads `.env`; `start` and `seed:live` scripts |
| `scripts/start.mjs` (new) | Reads `.env` with Node's built-in `process.loadEnvFile`, names missing settings, builds the frontend, starts uvicorn on `PORT` or 8000 (R63) |
| `scripts/seed-live.mjs` (new) | Reads `.env` and runs the seed, which asks for "yes" |
| `render.yaml` (new) | The web service (R64) |
| `.env.example` (new) | The three setting names, empty |
| `.gitignore` | `frontend/dist/` if not already ignored |
| `playwright.config.ts` | `DATABASE_URL`, `ACCOUNTABLE_AUTH=local`, readiness URL `/api/health` |
| `e2e/fixtures.ts` | Reseed with `DATABASE_URL`; a `signedIn` fixture that signs in through the sign-in screen as a chosen teammate (Maya Torres by default), with an opt-out for signed-out tests |
| `e2e/navigation.spec.ts`, `organizations.spec.ts`, `contacts.spec.ts`, `deals.spec.ts`, `pipeline.spec.ts`, `activities.spec.ts`, `dashboard.spec.ts` | Only if the fixture alone doesn't get them passing: the top bar moves the page down |
| `e2e/sign-in.spec.ts`, `who-added.spec.ts` (new) | See Proof |
| `.mcp.json` | The Supabase MCP server, read-only and limited to the project, for the live database check |
| `.claude/agents/ui-check.md` | Sign in as a made-up teammate before checking pages (R48) |
| `scripts/dev-api.mjs`, `scripts/env-file.mjs` (new, added in the build) | `dev:api` sets `ACCOUNTABLE_AUTH=local` in Node, so it works on Windows too; `start.mjs` and `seed-live.mjs` share the `.env` reading |

Added in the build: `e2e/fixtures.ts` has `signedInHeaders(page)` for the specs that call the API directly (`pipeline.spec.ts` and `light-mode.spec.ts`).

### Part 6: Search

| File | Change |
|---|---|
| `backend/app/search/__init__.py`, `routes.py`, `schemas.py`, `service.py` (new) | `GET /api/search` (R58 to R62, concern 19): `func.lower` on both sides, `%`, `_` and `\` escaped, starts-with first, 5 per group |
| `backend/tests/test_search.py` (new) | See Proof |
| `frontend/src/features/search/SearchBox.tsx`, `SearchResults.tsx`, `queries.ts`, `types.ts`, `highlight.ts`, `search.css` (new) | The box, the panel, 200ms debounce, keyboard use, the semibold match |
| `SearchBox.test.tsx`, `highlight.test.ts` (new) | See Proof |
| `e2e/search.spec.ts` (new) | See Proof |

### Part 7: User menu and theme

| File | Change |
|---|---|
| `frontend/src/lib/theme.ts`, `theme.test.ts` | `light`, `dark` or `system`; anything else means system; follows `prefers-color-scheme` live (concern 14) |
| `frontend/index.html` | The early script works out system before drawing |
| `frontend/src/ui/UserMenu.tsx`, `UserMenu.test.tsx`, `usermenu.css` (new) | Radix dropdown: name and email, Theme radio items, Sign out (R6a, R53) |
| `frontend/src/ui/Rail.tsx`, `Rail.test.tsx` | Dark mode button removed |
| `frontend/src/ui/ThemeToggle.tsx`, `ThemeToggle.test.tsx` | Deleted |
| `e2e/theme.spec.ts` | Rewritten for the menu |
| `e2e/light-mode.spec.ts` and `e2e/light-mode.spec.ts-snapshots/*` | Signs in as Maya Torres, saves `light`, new baselines for Mac and Linux (concern 15) |

### Docs (the lead agent)

`docs/STATUS.md` at the end of each phase; `docs/spec.md` and the area files if the build adds anything; this plan. `docs/TECH_STACK.md` gets one line for Supabase, Postgres, Render and the new libraries.

### The case for each new dependency

- **alembic**: R65 asks for migrations that run on start, stamp an existing database and run on SQLite and Postgres. Hand-rolled versioning would repeat what Alembic does, and it comes from SQLAlchemy's makers.
- **psycopg[binary]**: SQLAlchemy needs a driver to reach Postgres. The binary build avoids a C compiler on Render.
- **pyjwt[crypto]**: checking Supabase's ES256/RS256 signatures needs a JWT library with crypto; its `PyJWKClient` already caches keys by `kid`. It also signs local-mode tokens.
- **@supabase/supabase-js**: Supabase's own client signs in, renews the session before it expires and signs out. Renewing by hand is easy to get wrong.
- **@radix-ui/react-dropdown-menu**: the user menu needs radio items, arrow keys, Escape and focus return (R6a). The app already uses Radix for dialogs and popovers, and the spec's library table names Radix for menus.

## Order of work

Each phase ends with `npm run check` passing and `docs/STATUS.md` updated. Steps marked **Ask the person** stop there until they answer.

### Phase 1: sign-in and the database

1. **Part 1, contracts first.** Add the dependencies, `users` and the who-added columns in `tables.py`, the two migrations, `run_migrations`, the settings in `config.py`, `core/auth.py` with `CurrentUser`, the account routes, and the new `conftest.py`. Every existing test still passes, signed in as Maya Torres. This is the one step the others wait for.
2. Then in parallel:
   - **Part 2**: who added and last changed each record, area by area, with `test_who_added.py`.
   - **Part 3**: the sign-in screen, the session, the token in `client.ts`, `RequireSignIn`, the top bar (empty on the right for now). The frontend dependencies go in here, the dropdown menu's too, so Part 7 doesn't touch the lock file.
   - **Part 4**: `AddedBy` and the names on record pages, the timeline and recent activity, against the fields Part 2 returns.
   - **Part 5**: scripts, `render.yaml`, `.env.example`, the Playwright config and the signed-in fixture, `sign-in.spec.ts` and `who-added.spec.ts`. The sign-out test in `sign-in.spec.ts` waits for Phase 3.
3. Part 1 finishes `main.py`: the built frontend and its fallback, the seed-on-empty check, the "yes" check in the seed.
4. `npm run check` passes. Every API route answers 401 signed out, and every page shows the sign-in screen.
5. **Ask the person** to fill in `.env` with `DATABASE_URL`, `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, and to add at least two teammates in Supabase's dashboard, one with a display name and one without. The agent can't edit `.env`.
6. **Ask the person** to run `npm start`, sign in with a real account, add a record, and say what they see. That run migrates the empty Supabase database and loads the sample data.

### Phase 2: search

7. **Part 6**: `search/` backend with `test_search.py`, then `SearchBox` with its unit tests.
8. Part 1 adds the search router to `main.py`; Part 3 places `SearchBox` in `TopBar.tsx`.
9. `e2e/search.spec.ts`. `npm run check` passes.

### Phase 3: the user menu

10. **Part 7**: `theme.ts` with system, the `index.html` script, `UserMenu`, the rail without the toggle, `ThemeToggle` deleted.
11. Part 3 places `UserMenu` in `TopBar.tsx`. Part 5 finishes the sign-out test.
12. `e2e/theme.spec.ts` rewritten. Mac baselines for `light-mode.spec.ts` taken again, signed in as Maya Torres with `light` saved, after checking each screenshot by eye.
13. **Ask the person** for the Linux baselines (`scripts/check-baselines.mjs` says how), since CI no longer runs the end-to-end tests.

### Finish

14. `ui-check` on `npm run dev` in light and dark; fix what it finds.
15. **Ask the person** to add the Supabase project reference to `.mcp.json`'s Supabase server, then run the live database check (tables, migration record, row-level security on every table, records carrying the right person).
16. **Ask the person** to push, and tell me the CI result.
17. **Ask the person** to walk through the app in Chrome, both modes, and once through `npm start` against Supabase.
18. **Ask the person** to create the Render service from `render.yaml`, enter the three settings, and confirm it answers at its `onrender.com` address after the merge.

## Risks

- **Tests reaching Supabase.** A wrong default or a stray `.env` read would put Supabase in the test path. Guard: only `scripts/start.mjs` and `scripts/seed-live.mjs` read `.env`; tests set `ACCOUNTABLE_AUTH=local` and `DATABASE_URL` themselves; a test proves nothing in the backend reads `.env`; local mode refuses a non-SQLite database; the e2e fixture fails on any request off localhost.
- **Losing local data in the migration.** An existing `backend/data/accountable.db` has the tables but no Alembic record. If stamping is skipped, the baseline tries to create tables that exist, or worse, a reset runs. `test_migrations.py` builds a database the old way, migrates it, and checks every row survives and is credited to "Sample data".
- **SQLite and Postgres behaving differently.** Column changes on SQLite need Alembic's batch mode; `lower()` differs on accented capitals (concern 19); timestamps with time zones read back differently. The tests never run on Postgres, so `npm start` and the live database check are the only proof. Keep to SQLAlchemy Core constructs both dialects write the same way (concern 21).
- **Row-level security missed.** A table left without it is served by Supabase's Data API to anyone with the public key. The migration turns it on for every table, `alembic_version` included, and the live database check confirms it.
- **The token check too loose or too slow.** Accepting the wrong audience or issuer, or fetching keys on every request, would be a hole or a slowdown. Unit tests cover each refusal and the refetch on an unknown `kid` with a fake key set and no network.
- **A route left open.** A new route without the sign-in dependency would serve data signed out. `test_signed_out.py` walks every route the app has, so a new one can't be missed.
- **Unit tests over a second.** Making keys, running migrations per test and debounce timers can be slow. Make the key pair once per session, migrate one template database and copy the file per test, and use fake timers for the search debounce.
- **Every request writing to `users`.** An upsert per request adds a write to every GET. Write only when the name or email changed, compared against a read.
- **Parallel agents drifting.** Parts 2, 3 and 4 work against contracts from step 1 (tables, `CurrentUser`, the response fields in `sign-in.md`). If a part needs a contract changed, it stops and asks the lead instead of editing another part's file.
- **Theme regressions.** Moving from two modes to three changes what an unknown or missing value means. A saved `dark` must still open dark, and nothing saved must follow the device. Unit tests and `theme.spec.ts` cover both.
- **Baselines.** The top bar changes every page, so every light-mode baseline is retaken. A wrong screenshot taken as the new baseline would lock in a bug, so each is checked by eye first. The Linux copies need the person.
- **Render's free plan.** It sleeps and wakes in about a minute, and Supabase's direct connection is IPv6 only, so `DATABASE_URL` must be the session pooler on port 5432. Written in `docs/STATUS.md` for the person setting it up.

## Proof

### Backend unit tests (pytest)

- `test_auth.py`: a good Supabase token; refused when expired, signed with another key, with the wrong audience, or the wrong issuer; a token naming an unknown `kid` fetches the keys once more, a known one doesn't; the person's id, email and name come from the token only (concern 17). Local tokens: each made-up teammate signs in, a wrong password or unknown email is refused, a token from an earlier start is refused (R54).
- `test_config.py`: `DATABASE_URL` and its default; `postgresql://` becomes the psycopg driver; local mode refuses a non-SQLite database; Supabase mode without its settings refuses and names them (concern 16); nothing reads `.env`.
- `test_hosts.py`: `localhost` and `127.0.0.1` allowed, the Render hostname allowed only when set, anything else 400 (concern 22).
- `test_signed_out.py`: walks every route of the app; each answers 401 with no token or a bad one, except `/api/config`, `/api/health` and, in local mode, `/api/auth/local` (R51).
- `test_account.py`: `/api/config` in each mode; `/api/health`; `/api/me` with name, email and initials; the `users` row is added from the token and updated when the name changes; names and initials from a display name or an email (R55).
- `test_who_added.py`: who added and last changed each record through every way in: add, edit, a move on the board, marking a follow-up done, and a stage-change entry by the person who changed the stage; responses carry the names (R56, R57).
- `test_migrations.py`: a new database; a database made the old way keeps every row and credits it to "Sample data"; running twice changes nothing (R65).
- `test_seed.py`: counts and spread as before, every record credited to `sample-data`, `users` kept on reset, and the "yes" check against a fake Postgres URL with fake input, so nothing is reached (R41). The seed on start runs only when there are no records (R40).
- `test_search.py`: any case; part of a name; a contact's first and last name together; starts-with first then alphabetical; at most 5 per group; empty groups; under 2 characters returns empty lists; over 100 is 422; `%`, `_` and `\` matched as themselves (R58 to R62, concern 19).
- The existing tests (lists, deal rules, stages, move, deletes, validation, dashboard, persistence, transactions) all pass signed in.
- Every unit test runs in under a second (R66).

### Frontend unit tests (Vitest)

- `SignInPage.test.tsx`: the fields and button; the wrong-password and can't-reach errors; "Signing in..." while waiting; the local-mode line only in local mode (R49, R50, R54).
- `session.test.ts`: local sign-in stores the token and sign-out clears it; Supabase sign-in, renewal and sign-out go through a fake supabase-js client.
- `RequireSignIn.test.tsx`: signed out shows the sign-in screen at the same address; after a 401, "Your session ended. Sign in again." (R52).
- `client.test.ts`, `client.errors.test.ts`: the bearer token is sent; a 401 clears the cache and signs out.
- `initials.test.ts`: "Maya Torres" is MT, "Cher" is C, `jordan@example.com` is JO (R55).
- `AddedBy.test.tsx` and the record page, timeline and dashboard tests: "Added by" and "Last changed by" lines, "Sample data" for sample records, the name after each entry's date (R57).
- `TopBar.test.tsx`: the search box and the user menu in place.
- `SearchBox.test.tsx`: nothing under 2 characters; "Searching...", no matches, the error message; groups in order with chips and details; arrows, Enter on the first result by default, Escape, click; opening clears the box (R58 to R62). `highlight.test.ts`: the matching part, in any case.
- `theme.test.ts`: `light`, `dark` and `system` read and saved; missing or unknown means system; system follows the device as it changes (concern 14).
- `UserMenu.test.tsx`: initials on the button, name and email (or just the email), the ticked theme, choosing a theme, Sign out (R6a, R53).
- `Rail.test.tsx`: no dark mode button.

### End-to-end tests (Playwright, local sign-in, no network)

- `sign-in.spec.ts`: signed out, every route shows the sign-in screen and the API refuses; a wrong password shows its error; signing in opens the page that was asked for; signing out from the user menu shows the sign-in screen at the same address (R49 to R53).
- `who-added.spec.ts`: a record added in the test shows the teammate who added it, an edit by a second teammate shows "Last changed by", and a sample record shows "Sample data" (R57).
- `search.spec.ts`: finds an organization, a contact and a deal by part of a name in any case, and opens each with the mouse and with the keyboard (R58 to R61).
- `theme.spec.ts`: the menu switches to Dark, Light and System; the choice survives a reload; System follows the emulated device setting as it changes; no saved choice opens in System; a saved `dark` from before still opens dark (R6a, concern 14).
- `light-mode.spec.ts`: every page matches its new baseline, signed in as Maya Torres with `light` saved and today fixed (concern 15).
- The existing navigation, list, pipeline, activity and dashboard specs pass, signed in through the fixture.
- Every test fails on a console error or a request off localhost, which also proves the tests never touch Supabase.

### Beyond the tests

- `npm run check` passes with `.env` filled in and with it empty (success criterion 1).
- The live database check with the Supabase MCP server: tables, the migration record, row-level security on every table, and records added through `npm start` carrying the right person.
- The person's walkthrough in Chrome in both modes, and once through `npm start` signed in against Supabase (success criterion 6).
- CI passes on the pushed branch.
