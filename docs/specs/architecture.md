# Architecture and code structure

How Accountable is built across every area: the architecture, the libraries, the shared data model and API conventions, and where the code lives. Part of the spec; the summary and index are in `docs/spec.md`. Each area's tables and endpoints are in its own file.

## Architecture

```
browser
  └─ React + Vite app (frontend/, port 5173)
       └─ /api/*  proxied by Vite in dev
            └─ FastAPI (backend/, port 8000)
                 └─ SQLAlchemy Core
                      └─ SQLite file (backend/data/accountable.db, git-ignored)
```

- The backend owns all the business rules: stage probabilities, close dates, stage-change entries, delete cascades, positions and dashboard figures. The frontend never works these out for saved data. Its only exception is the instant totals while a card is being dragged (R24), which are then replaced by the server's answer.
- The database comes from the environment variable `ACCOUNTABLE_DATABASE_URL`, a SQLAlchemy database URL. It defaults to the SQLite file `backend/data/accountable.db`, found from the backend folder rather than the folder a command runs in. Tests point it at a temporary file. Moving to Supabase's Postgres later means changing this setting, not the code.
- Today's date comes from `today()` in `core/config.py`, so every rule that depends on it agrees. Tests fix it with `ACCOUNTABLE_TODAY`; the running app never sets it.
- Each API request runs in one database transaction, so a change either saves completely or not at all.
- The API only answers requests addressed to `localhost` or `127.0.0.1` (`ALLOWED_HOSTS` in `core/config.py`) and refuses any other host with 400, so a web page can't reach it by pointing its own domain name at this computer (DNS rebinding).

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

Sorting and searching happen in the browser. With a few hundred rows at most, that's instant and keeps the API simple.

## Data model

All tables have an integer `id` primary key and `created_at` / `updated_at` timestamps. Timestamps (these two and `occurred_at`) are stored in UTC and shown in local time. Plain dates (`close_date`, `follow_up_date`) are stored as dates. Foreign keys are switched on in SQLite (`PRAGMA foreign_keys = ON`).

Each table is described in its area's file: `organizations.md`, `contacts.md`, `deals.md` and `activities.md`.

## API

All responses are JSON. Creating returns 201, and deleting returns 204 with no body. Errors use FastAPI's standard shape, with status 404 for missing records, 409 for a refused change and 422 for invalid input.

Each area's endpoints, and the rules the backend applies to them, are in its own file.

## Code structure

The code is grouped by area of the product, not by technical layer, so a new area (such as invoicing) is a new folder on each side and nothing else has to move.

```
backend/app/
  main.py              creates the app, checks the host, seeds a new database, adds each area's routes
  core/
    config.py          database URL, today(), allowed hosts
    db.py              engine, foreign keys on, one transaction per request
    tables.py          all tables, in one place
    errors.py          404, 409 and 422 errors, raised by services
    fields.py          field types shared by the request schemas
  organizations/       routes.py, schemas.py, service.py
  contacts/            routes.py, schemas.py, service.py
  deals/               routes.py, schemas.py, service.py, stages.py
  activities/          routes.py, schemas.py, service.py
  dashboard/           routes.py, schemas.py, service.py
  seed.py              the sample data, and the reset command
backend/tests/         pytest; conftest.py gives each test a fresh database and a fixed today()

frontend/index.html    the page, with the small script that applies the saved mode before drawing (concern 14)
frontend/src/
  main.tsx, App.tsx    providers and routes
  api/client.ts        the one fetch wrapper and its error type
  ui/                  app-wide pieces: AppLayout, Rail, PageHeader, DataTable, ConfirmDeleteDialog,
                       FormDialog, Toast, form fields, RecordPicker, Avatar, NotFoundPage, ThemeToggle,
                       empty/loading/error states
  lib/                 formatting (money, dates, percent), initials, email and website checks,
                       theme.ts (reads, saves and applies the mode)
  features/
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
scripts/              test-all.mjs (npm test), check.mjs (npm run check), run-steps.mjs (runs steps, prints the summary)
lefthook.yml           the git pre-commit hook
.github/workflows/     ci.yml (npm run check:quick on every push)
.claude/hooks/         Claude Code hooks: check-on-stop.mjs (check:quick when a turn ends), protect-env.mjs
.claude/agents/        Claude Code subagents: reviewer.md (reviews a branch, read-only), ui-check.md (checks the running app in the browser)
```

Rules that keep it this way:

- Route files are thin. They check the request, call one function in their area's `service.py`, and return the result.
- Services are plain functions that take the request's database connection, and later the signed-in user. There are no repository classes, no ORM models and no dependency-injection framework.
- `core/`, `ui/` and `lib/` never import from an area. Areas may call each other where they need to; for example, deals calls activities to log a stage change, and the dashboard uses the pipeline's `PipelineStrip`.
- Styles that belong to one area sit in a CSS file in that area's folder. App-wide styles are in `ui/` and `styles/`.
- Frontend types are written by hand, in each area's `types.ts`. After any change to data, the frontend refreshes all its queries, which keeps every screen current, the dashboard included (R38).
- Left out on purpose until they pay off: API versioning, types generated from the API, and Alembic schema migrations. Alembic comes with the first schema change, starting from a baseline that matches the existing database, so no data is lost.

Routes: `/`, `/organizations`, `/organizations/:id`, `/contacts`, `/contacts/:id`, `/deals`, `/deals/:id`, `/pipeline`. Any other address shows the not-found page (R1).
