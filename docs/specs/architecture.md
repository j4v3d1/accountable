# Architecture and code structure

How Accountable is built across every area: the architecture, the settings, the libraries, the shared data model and API conventions, and where the code lives. Part of the spec; the summary and index are in `docs/spec.md`. Each area's tables and endpoints are in its own file.

## Concerns

- **20. Supabase's Data API.** Supabase serves every table in the `public` schema to anyone holding the publishable key, which is public, unless row-level security is on. A migration turns it on for every table, `alembic_version` included, with no policies, so the Data API serves nothing. The backend connects as the database owner, which row-level security doesn't limit. Every table a later change adds turns it on in its own migration. On SQLite the step is skipped.
- **21. One set of queries for SQLite and Postgres.** The tests and `npm run dev` use SQLite and the live app uses Postgres, so queries stick to what SQLAlchemy Core writes the same way for both: no database-only functions, and dates worked out in Python. Timestamps are stored with their time zone in UTC. The tests never run on Postgres (concern 23), so `npm start` and the live database check at Test are the only proof on Postgres.
- **22. The host check on Render.** The API still refuses any host it doesn't expect (DNS rebinding). `localhost` and `127.0.0.1` are always allowed, and on Render the app also allows the hostname Render gives it in `RENDER_EXTERNAL_HOSTNAME`. Nothing else is added, so the setting can't be widened by mistake.

## Architecture

Two ways to run it:

```
npm run dev, the tests and ui-check (local sign-in, concern 16):
browser
  └─ React + Vite app (frontend/, port 5173)
       └─ /api/*  proxied by Vite in dev
            └─ FastAPI (backend/, port 8000)
                 └─ SQLAlchemy Core
                      └─ SQLite file (backend/data/accountable.db, git-ignored)

npm start and Render (Supabase sign-in):
browser ──── sign in, renew, sign out ────> Supabase Auth
  └─ FastAPI (one address: the built frontend and /api/*)
       ├─ checks each token with Supabase's public signing keys (concern 17)
       └─ SQLAlchemy Core with psycopg
            └─ Postgres on Supabase (session pooler, port 5432)
```

- The backend owns all the business rules: stage probabilities, close dates, stage-change entries, delete cascades, positions, who added and changed each record, search and dashboard figures. The frontend never works these out for saved data. Its only exception is the instant totals while a card is being dragged (R24), which are then replaced by the server's answer.
- The settings come from environment variables:
  - `DATABASE_URL`, the database. A `postgresql://` address, as Supabase gives it, is used with the psycopg driver. When it's not set, the database is the SQLite file `backend/data/accountable.db`, found from the backend folder rather than the folder a command runs in. Tests point it at a temporary file;
  - `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, for Supabase sign-in;
  - `ACCOUNTABLE_AUTH`, `supabase` (the default) or `local` (concern 16);
  - `PORT`, `TZ` and `RENDER_EXTERNAL_HOSTNAME` on Render.

  Only `npm start` and `npm run seed:live` read them from `.env` (concern 23). The live database is Postgres on Supabase, reached through the session pooler on port 5432, because the direct connection is IPv6 only on the free plan and Render can't reach it.
- Today's date comes from `today()` in `core/config.py`, so every rule that depends on it agrees. Tests fix it with `ACCOUNTABLE_TODAY`; the running app never sets it.
- Each API request runs in one database transaction, so a change either saves completely or not at all.
- Each API request but the public ones (R51) starts by checking the token and finding the signed-in person (R55). Services get that person with the connection, so who added a record always comes from the token.
- With a built frontend (`npm start` and Render), FastAPI serves its files, and any address outside `/api/` that isn't a file gets `index.html`, so a refreshed record page still opens. The built files hold no data, so they're served without sign-in.
- The API only answers requests addressed to `localhost`, `127.0.0.1` or, on Render, its own hostname (`allowed_hosts()` in `core/config.py`, concern 22), and refuses any other host with 400, so a web page can't reach it by pointing its own domain name at this computer (DNS rebinding).

## Libraries

| Need | Library |
|---|---|
| Routing | React Router |
| Server data, caching, optimistic updates | TanStack Query |
| Tables (sort, filter) | TanStack Table |
| Charts | Recharts |
| Drag and drop | dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`) |
| Forms and validation | React Hook Form with Zod |
| Dialogs, menus, selects (accessible building blocks) | Radix UI primitives |
| Searchable pickers (choosing a contact, organization or deal) | `cmdk`, inside a Radix Popover |
| Icons | Lucide |
| Dates | date-fns |
| Fonts, offline | Fontsource packages |
| Running backend and frontend together | concurrently |
| Backend validation | Pydantic (comes with FastAPI) |
| Schema migrations | Alembic (from the same makers as SQLAlchemy, and planned for the first schema change) |
| Postgres driver | psycopg 3 (SQLAlchemy needs a driver to reach Postgres) |
| Checking session tokens | PyJWT with its `crypto` extra (checks Supabase's signatures without a call per request, concern 17) |
| Signing in, renewing and signing out in the browser | `@supabase/supabase-js` (Supabase's own client, which renews sessions) |

The last four are new with sign-in. The plan makes the case for each one, as the intent asks.

Sorting and searching happen in the browser. With a few hundred rows at most, that's instant and keeps the API simple.

## Data model

All tables have `created_at` / `updated_at` timestamps, and all but `users` have an integer `id` primary key. Timestamps (these two and `occurred_at`) are stored in UTC and shown in local time. Plain dates (`close_date`, `follow_up_date`) are stored as dates. Foreign keys are switched on in SQLite (`PRAGMA foreign_keys = ON`). The tables come from the migrations (R65), and row-level security is on for each one on Postgres (concern 20).

Each table is described in its area's file: `organizations.md`, `contacts.md`, `deals.md`, `activities.md`, and `users` with the who-added columns in `sign-in.md`.

## API

All responses are JSON. Creating returns 201, and deleting returns 204 with no body. Errors use FastAPI's standard shape, with status 401 when signed out, 404 for missing records, 409 for a refused change and 422 for invalid input.

Each area's endpoints, and the rules the backend applies to them, are in its own file.

## Code structure

The code is grouped by area of the product, not by technical layer, so a new area (such as invoicing) is a new folder on each side and nothing else has to move.

```
backend/app/
  main.py              creates the app, checks the host, runs the migrations, seeds an empty database,
                       adds each area's routes, and serves the built frontend when there is one
  core/
    config.py          the settings (concern 23), today(), allowed hosts
    auth.py            checks the token, local or Supabase, and keeps the person in users (R51, R55)
    db.py              engine, foreign keys on, one transaction per request
    tables.py          all tables, in one place
    errors.py          401, 404, 409 and 422 errors, raised by services
    fields.py          field types shared by the request schemas
  organizations/       routes.py, schemas.py, service.py
  contacts/            routes.py, schemas.py, service.py
  deals/               routes.py, schemas.py, service.py, stages.py
  activities/          routes.py, schemas.py, service.py
  dashboard/           routes.py, schemas.py, service.py
  account/             routes.py, service.py: /api/config, /api/health, /api/me, local sign-in
  search/              routes.py, schemas.py, service.py
  seed.py              the sample data, and the reset command with its "yes" check
backend/migrations/    Alembic: the baseline, then one migration per schema change (R65)
backend/tests/         pytest; conftest.py gives each test a fresh database, a fixed today() and a signed-in person

frontend/index.html    the page, with the small script that applies the saved mode, or the device's, before drawing (concern 14)
frontend/src/
  main.tsx, App.tsx    providers and routes
  api/client.ts        the one fetch wrapper and its error type; adds the token, and signs out on a 401 (R52)
  ui/                  app-wide pieces: AppLayout, Rail, TopBar, UserMenu, PageHeader, DataTable,
                       ConfirmDeleteDialog, FormDialog, Toast, form fields, RecordPicker, Avatar,
                       AddedBy, NotFoundPage, empty/loading/error states
  lib/                 formatting (money, dates, percent), initials (from a name or an email), email and
                       website checks, theme.ts (reads, saves and applies the mode, and follows the device)
  features/
    auth/              SignInPage, the session (Supabase or local), RequireSignIn, the me query
    search/            SearchBox and its results panel, the search query
    organizations/     list and record pages, form and dialogs, query hooks, types, website links
    contacts/          list and record pages, form and dialogs, query hooks, types, StatusChip
    deals/             list and record pages, form and dialogs, query hooks, types,
                       StageChip, LateBadge, ProbabilityDots
    activities/        Timeline, ActivityForm and its dialogs, LogActivityDialog, ActivityIcon,
                       query hooks, types
    pipeline/          PipelinePage, Board, DealCard, PipelineStrip, board.ts (moves and totals),
                       the move query
    dashboard/         the dashboard page and its panels
  styles/              tokens.css (every color, light and dark), base.css

e2e/                   Playwright tests, and fixtures.ts shared by all of them; today.ts fixes today's
                       date, the clock and the time zone for the whole run; the light-mode
                       baseline screenshots sit beside the visual test (concern 15)
scripts/              test-all.mjs (npm test), check.mjs (npm run check), run-steps.mjs (runs steps, prints the summary),
                       start.mjs (npm start: reads .env, builds, starts)
render.yaml            the Render web service (R64)
lefthook.yml           the git pre-commit hook
.github/workflows/     ci.yml (npm run check:quick on every push)
.claude/hooks/         Claude Code hooks: check-on-stop.mjs (check:quick when a turn ends), protect-env.mjs
.claude/agents/        Claude Code subagents: reviewer.md (reviews a branch, read-only), ui-check.md (checks the running app in the browser)
```

Rules that keep it this way:

- Route files are thin. They check the request, call one function in their area's `service.py`, and return the result.
- Services are plain functions that take the request's database connection and the signed-in person. There are no repository classes, no ORM models and no dependency-injection framework.
- `core/`, `ui/` and `lib/` never import from an area. Areas may call each other where they need to; for example, deals calls activities to log a stage change, and the dashboard uses the pipeline's `PipelineStrip`.
- Styles that belong to one area sit in a CSS file in that area's folder. App-wide styles are in `ui/` and `styles/`.
- Frontend types are written by hand, in each area's `types.ts`. After any change to data, the frontend refreshes all its queries, which keeps every screen current, the dashboard included (R38).
- Every schema change is an Alembic migration (R65); `create_all` is no longer used.
- Left out on purpose until they pay off: API versioning and types generated from the API.

Routes: `/`, `/organizations`, `/organizations/:id`, `/contacts`, `/contacts/:id`, `/deals`, `/deals/:id`, `/pipeline`. Any other address shows the not-found page (R1). Signed out, every address shows the sign-in screen instead (R49); there's no separate sign-in address.
