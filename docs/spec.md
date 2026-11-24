# Spec: Accountable

This is what Accountable is and does today, and how it's built. It's the first thing to read before any change. A change updates this file so it describes the product as it will be once the change is merged.

The stack is in `docs/TECH_STACK.md`, and the look follows the brand skill (`.claude/skills/brand`).

## Problem

A small real estate business keeps track of its clients and property deals in spreadsheets, inboxes and people's heads. Nobody can see at a glance which companies we work with, who our buyers, sellers and leads are, what's in the deal pipeline, what happened last with a client or what needs doing next.

## The product

Accountable is a business management system: a sales CRM that will grow into a full Business OS, including ERP. Today it's a complete real estate sales CRM for one agent, running on their own computer: a private Salesforce that does the everyday CRM essentials well, and feels sharp, modern and professional.

It's for a generic real estate business. It uses no real brokerage's name or branding, and its sample data is fictional.

### Who uses it

- One real estate agent, using Accountable on their own computer every day. The rest of the team joins later.
- No other systems are connected.

### At a glance

Five sections:

- **Dashboard**, the landing page: how sales are going at a glance, with revenue won by month, the open pipeline, a sales funnel, won and lost deals, follow-ups and recent activity.
- **Organizations**: the companies we work with, such as other brokerages, mortgage lenders, developers, property management firms and relocation firms.
- **Contacts**: the people we deal with: buyers, sellers and leads. A lead is a contact with the Lead status, so there's no separate list of leads.
- **Deals**: the property transactions, each with its stage, value, probability of close and close date.
- **Pipeline**: the deals as cards on a board, one column per stage, moved by dragging.

Four kinds of record: organizations, contacts, deals and activities (notes, calls and emails, with optional follow-ups, plus the stage changes the system logs). Most buyers and sellers are individuals, so a contact or deal doesn't need an organization.

### How it runs

- It runs locally, started with one documented command that works on Mac, Linux and Windows. It needs no internet connection.
- Every change is kept: it's still there after a browser refresh and after a restart.
- One documented command resets the data to the sample data.

### Not built yet

- Sign-in, user accounts, several people sharing the same data, or a record of who did what.
- Access from anywhere but the computer it runs on.
- Following the device's own dark mode setting. The app starts in light mode until the agent picks dark.
- A layout for phones.
- AI features.
- Email, calendar or phone integrations.
- Currencies other than US dollars.
- Reports beyond the dashboard.
- Tags or custom fields.
- Changing the pipeline stages.
- Importing or exporting data.
- Commission tracking.
- Property listings or MLS data, or properties as a separate kind of record. A deal's property is described in its name and notes.
- Undo, bulk actions, pagination (the data is small), and filters other than contact status.
- Hiding old closed deals from the pipeline (concern 9).

## Concerns

These settle points where the brand, the platform or the data left a choice. Requirements and code comments refer to them by number, as in "concern 5".

1. **Stage colors.** The brand colors things that sit side by side Sea Green, Marigold, Coral, Cerulean and Raspberry, in that order. That's five colors for seven stages, and the order would make Under Contract Raspberry, the alert color. So the five open stages share one Cerulean scale, light to deep. Closed (Won) is Sea Green and Lost is a muted gray. Raspberry is kept for late deals and overdue follow-ups. Chart series that aren't stages follow the brand's order.
2. **White text on Cerulean and Raspberry.** It measures 3.96:1 on Cerulean and 3.62:1 on Raspberry, below the 4.5:1 WCAG AA needs for normal text. White-on-color is only used for text at least 14px and semibold, which needs only 3:1, such as buttons and badges. Small text in these colors uses the darker shades in the color tokens below. In dark mode, small colored text uses the lighter shades instead, and every text token passes 4.5:1 on the dark page, panels and tints (concern 13).
3. **Fonts offline.** The brand's fonts come from Google Fonts, but the app works offline. The fonts are installed as npm packages (`@fontsource-variable/instrument-sans`, `@fontsource/instrument-serif`, `@fontsource-variable/jetbrains-mono`) and served with the app. Nothing loads from a CDN.
4. **Setup before the one command.** `npm run dev` needs Node.js and uv installed, and `npm install` run once. `docs/STATUS.md` lists these setup steps. `npm run dev` runs `uv sync` itself before it starts the backend, so there's no separate Python step.
5. **What an activity belongs to.** Every activity belongs to exactly one contact or exactly one deal. A contact's timeline shows its own activities, plus the activities and stage changes of deals where they are the main contact, each labelled with the deal's name. Deleting a contact only deletes the activities that belong to the contact, so it never wipes history from their deals.
6. **Stage-change entries.** A stage change is a fourth kind of activity, `stage_change`. Only the system creates them. They can't be edited or deleted by hand, and they're deleted with their deal.
7. **The close date when a deal is won or lost.** When a deal moves to Closed (Won) or Lost, its close date becomes today, so revenue counts in the month the deal was actually won. It can still be edited afterwards.
8. **What the sales funnel measures.** Lost deals all sit in Lost, so their current stage can't say how far they got. The funnel uses each deal's furthest stage, taken from its stage-change history. A deal counts in every stage up to and including its furthest one. The sample data has matching stage-change history.
9. **Closed and Lost columns.** The pipeline has one column per stage, so every deal ever won or lost appears on the board. All seven columns show all their deals, and each column scrolls on its own. The board's totals cover open deals only.
10. **How money is written.** Amounts are US dollars, written as `$485,000`, with "USD" in the heading where the amount appears, such as "Value (USD)" or "Revenue won (USD)". Large amounts on chart axes and tiles are shortened, as in `$1.2M`.
11. **Contact status doesn't follow deals.** A contact stays a lead after their deal closes unless someone changes it by hand. Nothing changes a status on its own.
12. **The dashboard's time window.** The charts show the last six calendar months, including the current one.
13. **Dark surfaces.** The brand gives dark mode a `#04232E` page with black panels and cards, and Sea Mist ink. Three things keep their light-mode colors in dark mode:
    - the navigation rail and the dashboard's revenue panel stay Midnight `#073B4C`. They're already dark and read correctly on both pages;
    - the stage colors and the solid brand fills (buttons, chart series, badges) stay the same, with the same text on them, so a color means the same thing in both modes;
    - white text stays on Cerulean and Raspberry, under the same 14px semibold rule (concern 2).

    Everything else that sits on a panel, such as tinted chips, icon circles, avatars, row washes, hover rows and chart axes, has its own dark value.
14. **Where the mode is kept.** The choice is saved in the browser's `localStorage` under `accountable-theme`, as `light` or `dark`. Anything else, or nothing, means light. It belongs to that browser on that computer: there's no backend setting, and `npm run seed` doesn't touch it. A small script in `index.html` reads it and marks the page before anything is drawn, so a dark page never flashes light on load.
15. **Proving light mode hasn't changed.** Moving every color into tokens touches most style files, so a Playwright visual test compares each page in light mode with screenshots taken before the change, with the toggle hidden. Dates in the sample data and on screen follow today, so the visual test fixes today's date in both the backend and the browser. Screenshots differ slightly between Mac and Linux, so there's a baseline for each platform `npm run check` runs on: Mac locally and Linux in CI.

## Requirements

Each requirement has an ID, so tests and status notes can point at it.

### Shared behavior

- **R1** The app opens on the Dashboard. A navigation rail on the left links to Dashboard, Organizations, Contacts, Deals and Pipeline, and marks the current section. An address that matches no page shows "Page not found" with a link to the dashboard.
- **R2** Every list page (Organizations, Contacts, Deals) has a table with:
  - a search box that filters rows as you type, matching any text column, including a contact's status and a deal's stage;
  - column headings that sort when clicked (ascending, then descending, then back to the default order);
  - a "New" button that opens a form;
  - edit and delete actions on each row.

  Clicking a row opens the record's page. Each record's page has a link back to its list, and Edit and Delete buttons. Deleting from the record's page goes back to the list.
- **R3** Forms check that required fields are filled in and that emails and websites look valid. They show errors next to the field. Saving closes the form, updates the table straight away, and shows a short confirmation.
- **R4** Delete asks first, in a dialog that names the record and gives counts of what will happen to linked records. Zero counts are left out. The rules:
  - Organization: its contacts and deals are kept and unlinked ("3 contacts and 2 deals will be unlinked").
  - Contact: their deals are kept with no main contact, and their activities are deleted ("2 deals will be unlinked, 5 activities will be deleted").
  - Deal: its activities are deleted, including stage changes ("7 activities will be deleted").

  While the counts load, the dialog says "Checking linked records...". If they can't be loaded, it says "Couldn't check linked records" with the reason, keeps Delete disabled, and offers "Try again".
- **R5** Every change is saved to the database straight away. It's still there after a refresh and after a restart.
- **R6** Dates are shown as `Nov 23, 2026`. Money follows concern 10. Probabilities are shown as `60%`.
- **R6a** A dark mode button sits at the bottom of the navigation rail on every page: a moon icon with the short label "Dark", styled like the section links. Its screen-reader name is "Dark mode", and it reads as pressed while dark mode is on, when its icon is Sea Green. Pressing it switches every page between light and dark at once, without a reload. Charts, dialogs, menus, pickers and confirmations follow the mode. The app opens in light mode until dark is chosen, and remembers the choice after a reload or restart (concern 14).

### Organizations

- **R7** Fields:
  - name (required);
  - website;
  - industry (one of: Brokerage, Mortgage lending, Development, Property management, Relocation, Other);
  - notes.

  A website is shown without its `http://` or `https://`. Its link is the website as typed when it starts with `http://` or `https://` (in any case), and otherwise has `https://` added.
- **R8** Table columns: name, industry, website, number of contacts, number of open deals.
- **R9** The organization's page shows its details, a list of its contacts and a list of its deals. Each item links to its record's page.

### Contacts

- **R10** Fields:
  - first name and last name (both required);
  - email;
  - phone;
  - job title;
  - organization (optional, chosen from a searchable list);
  - status (Lead, Qualified or Customer; required, default Lead).
- **R11** Table columns: name, status, organization, email, phone, last activity date (the local day it happened). A status filter (All, Lead, Qualified, Customer) sits next to the search box and works together with it.
- **R12** The contact's page shows:
  - their details and a link to their organization;
  - their deals;
  - their timeline (see concern 5), newest first;
  - a "Log activity" button.

### Deals

- **R13** Fields:
  - name, which describes the property, such as "142 Maple Ave purchase" (required);
  - main contact and organization (both optional, each chosen from a searchable list);
  - stage (required, default New Lead);
  - value, the property's price (whole US dollars, 0 or more, required);
  - probability of close (0 to 100, whole number);
  - close date, expected or actual (required);
  - notes.
- **R14** The stages are fixed, in this order, each with its usual probability of close:

  | Stage | Usual probability of close |
  |---|---|
  | New Lead | 10% |
  | Qualified | 20% |
  | Showing | 40% |
  | Offer | 60% |
  | Under Contract | 90% |
  | Closed (Won) | 100% |
  | Lost | 0% |

  The first five are the open stages. Choosing a stage, or moving a deal to a new stage, sets its probability to that stage's usual figure. A probability typed by hand is kept until the stage changes again.
- **R15** Moving a deal to Closed (Won) or Lost sets its close date to today (concern 7).
- **R16** A deal is **late** when its stage is not Closed (Won) or Lost and its close date is before today. Late deals stand out:
  - in the deals table, with a "Late" badge and the close date in Raspberry;
  - on their pipeline card, with the same badge.
- **R17** Table columns: name, stage, value, probability, expected value (value times probability), close date, contact, organization.
- **R18** The deal's page shows its details, links to its contact and organization, its timeline newest first, and a "Log activity" button.
- **R19** Every stage change creates a `stage_change` activity on the deal, worded "Moved from Showing to Offer". This happens whether the change is made from the pipeline, the edit form or anywhere else.

### Pipeline

- **R20** A board with seven columns in the fixed stage order.
  - Each column heading shows the stage name, the number of deals and their total value. Open stages also show their expected revenue and a thin bar for their share of open value. Closed (Won) and Lost are labelled "All time", because they keep every deal ever won or lost (concern 9).
  - Each card shows:
    - the main contact's initials in a colored circle (the organization's if there's no contact, and no circle if there's neither);
    - the deal name, with the contact and organization;
    - the value;
    - the probability, as a five-dot meter and a percentage;
    - the close date, or a "Late" label with the close date when the deal is late (R16).
- **R21** Above the board, a summary shows:
  - the total value and expected revenue of all open deals;
  - the number of late deals;
  - a thin strip of open value by stage.
- **R22** Dragging a card to another column changes the deal's stage. R14, R15 and R19 apply.
- **R23** A card can be dropped at any place in any column, including an empty one, and higher or lower in its own column. It stays at that place after a refresh.
- **R24** All totals update as soon as a card is dropped, without waiting for the server. If the server refuses the change, the card goes back and an error message shows.
- **R25** Each column has an "Add deal" button that opens the deal form with that stage already chosen. The new deal goes to the top of the column.
- **R26** Dragging works with the mouse, and also with the keyboard: focus a card, press space to pick it up, use the arrow keys to move it, and press space to drop it.
- **R27** Clicking a card (without dragging) opens the deal's page.

### Activities

- **R28** Fields:
  - type (Note, Call or Email);
  - description (required);
  - when it happened (date and time, default now);
  - follow-up date (optional);
  - done (only shown when there's a follow-up date).

  An activity belongs to one contact or one deal (concern 5).
- **R29** Activities are logged from the contact's or deal's page. The dashboard's "Log activity" asks first whether it's for a contact or a deal, and which one, from a searchable list. Each timeline entry shows an icon for its type, the description, the date, and the follow-up date if there is one. Entries for note, call and email activities can be edited and deleted. Stage-change entries can't (concern 6).
- **R30** A follow-up that isn't done is **overdue** if its date is before today, and **upcoming** if it's today or later. It shows on the dashboard until it's marked done.

### Dashboard

- **R31** A **summary line** under the title, such as "18 open deals worth $10,151,500. 2 follow-ups are overdue and 3 deals are past their close date." A part that would be zero is left out.
- **R32** A **revenue panel** with:
  - revenue won this month, as the large figure;
  - the change from last month, as a percentage. When last month's revenue was $0, it reads "No revenue won in October" (naming last month) instead;
  - the total for the last six months and the best month;
  - a **line chart** of revenue won per month over those six months (concern 12), with each month's figure labelled.
- **R33** Three **figure cards**:
  - **Open pipeline**, the total value of open deals, with the number of open deals and a mini stage strip;
  - **Expected revenue**, the sum of value times probability over open deals, with a ring showing it as a share of open value. With no open deals, the ring shows 0%;
  - **Deals won this month**, with last month's count, the win rate, and a small six-month chart of deals won.

  The **win rate** is deals won divided by deals won plus deals lost, over the last six months by close date. When none have been won or lost in that time, it reads "No closed deals yet".
- **R34** A **sales funnel** showing, for each stage from New Lead to Closed (Won), the number of deals and the value that reached it (concern 8). For every stage after New Lead, it also shows the share of deals that moved on from the stage before (deals reaching this stage divided by deals reaching the previous one). The share is left blank when the stage before had no deals.
- **R34a** A **won and lost chart** for the same six months: deals won as bars above a centre line and deals lost as bars below it, each labelled with its count. Underneath it go the six-month totals won and lost, and the win rate.
- **R35** A **pipeline strip**: one horizontal bar split by open stage, each part as wide as that stage's share of open value, labelled with the stage, value and count. Clicking it opens the Pipeline.
- **R36** **Follow-ups**, in three groups:
  - **Overdue**, in Raspberry;
  - **This week**, from today to Sunday;
  - **Later**.

  Each group is in date order, oldest first. Each follow-up has a round checkbox to mark it done, which removes it from the list, and links to its contact or deal.
- **R37** **Recent activity**: the latest 10 activities of every kind, including stage changes, each linked to its contact or deal.
- **R38** Every dashboard figure is worked out by the backend from the current data. It changes as soon as the data changes, such as a deal moving to Closed (Won) or a new follow-up being saved.

### Data and running

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
- **R47** GitHub Actions (`.github/workflows/ci.yml`) runs one job, `check`, on every push to any branch. It installs gitleaks and scans the working files and the whole git history first, so a leaked secret fails the run straight away. Then it installs Node and uv and runs `npm run check`, using the Google Chrome already on the runner. When the run fails, the Playwright HTML report and test results are uploaded. The workflow uses no secrets.

## Design

### Architecture

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

### Libraries

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

### Data model

All tables have an integer `id` primary key and `created_at` / `updated_at` timestamps. Timestamps (these two and `occurred_at`) are stored in UTC and shown in local time. Plain dates (`close_date`, `follow_up_date`) are stored as dates. Foreign keys are switched on in SQLite (`PRAGMA foreign_keys = ON`).

**organizations**: `name` text not null; `website` text; `industry` text, one of the R7 values; `notes` text.

**contacts**: `first_name` and `last_name` text not null; `email`, `phone`, `job_title` text; `organization_id` references organizations, **on delete set null**; `status` text not null, one of `lead`, `qualified` or `customer`.

**deals**: `name` text not null; `contact_id` references contacts, **on delete set null**; `organization_id` references organizations, **on delete set null**; `stage` text not null, one of `new_lead`, `qualified`, `showing`, `offer`, `under_contract`, `closed_won` or `lost`; `value` integer not null (whole dollars); `probability` integer not null, 0 to 100; `close_date` date not null; `position` integer not null (order within the stage, 0 at the top); `notes` text.

**activities**:
- `type` text not null, one of `note`, `call`, `email` or `stage_change`;
- `contact_id` references contacts, **on delete cascade**;
- `deal_id` references deals, **on delete cascade**;
- exactly one of `contact_id` and `deal_id` is set, enforced with a check constraint;
- `description` text not null;
- `occurred_at` datetime not null;
- `follow_up_date` date;
- `done` boolean not null, default false;
- `from_stage` and `to_stage` text, set only for `stage_change` activities.

The stage list, with labels and usual probabilities, lives in one backend module, `deals/stages.py`. The frontend gets it from `GET /api/stages`, so it's never written down twice.

### API

All responses are JSON. Creating returns 201, and deleting returns 204 with no body. Errors use FastAPI's standard shape, with status 404 for missing records, 409 for a refused change and 422 for invalid input.

| Method and path | Purpose |
|---|---|
| `GET /api/stages` | Stage list in order, with label, usual probability and whether it's open |
| `GET/POST /api/organizations` | List (with contact and open-deal counts), create |
| `GET/PATCH/DELETE /api/organizations/{id}` | One organization with its contacts and deals; update; delete |
| `GET /api/organizations/{id}/delete-impact` | `{contacts: 3, deals: 2}` for the delete dialog |
| `GET/POST /api/contacts` | List (with organization name and last activity date), create |
| `GET/PATCH/DELETE /api/contacts/{id}` | One contact with organization, deals and timeline; update; delete |
| `GET /api/contacts/{id}/delete-impact` | `{deals: 2, activities: 5}` |
| `GET/POST /api/deals` | List (with contact and organization names and a `late` flag), create |
| `GET/PATCH/DELETE /api/deals/{id}` | One deal with timeline; update; delete |
| `GET /api/deals/{id}/delete-impact` | `{activities: 7}` |
| `POST /api/deals/{id}/move` | Body `{stage, index}`: put the deal at `index` in `stage`'s column. Returns every deal, so the board can replace its copy |
| `POST /api/activities` | Create, on a contact or deal |
| `PATCH/DELETE /api/activities/{id}` | Update, delete (refused with 409 for `stage_change`) |
| `GET /api/dashboard` | Everything the dashboard shows, in one response |

Rules the backend applies:
- Creating or updating a deal with a new stage sets its probability to that stage's usual figure, unless the same request also sets the probability. A new stage also logs a stage change (R19) and, for Closed (Won) or Lost, sets the close date to today (R15).
- `move` takes the deal out of its old column and inserts it at `index` in the new one. It renumbers `position` in both columns, in one transaction. A move within the same column changes the order only. An index past the end puts the deal last.
- A new deal goes to position 0 in its column, and the others move down one.

### Code structure

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
.github/workflows/     ci.yml (npm run check on every push)
.claude/hooks/         Claude Code hooks: check-on-stop.mjs (check:quick when a turn ends), protect-env.mjs
```

Rules that keep it this way:

- Route files are thin. They check the request, call one function in their area's `service.py`, and return the result.
- Services are plain functions that take the request's database connection, and later the signed-in user. There are no repository classes, no ORM models and no dependency-injection framework.
- `core/`, `ui/` and `lib/` never import from an area. Areas may call each other where they need to; for example, deals calls activities to log a stage change, and the dashboard uses the pipeline's `PipelineStrip`.
- Styles that belong to one area sit in a CSS file in that area's folder. App-wide styles are in `ui/` and `styles/`.
- Frontend types are written by hand, in each area's `types.ts`. After any change to data, the frontend refreshes all its queries, which keeps every screen current, the dashboard included (R38).
- Left out on purpose until they pay off: API versioning, types generated from the API, and Alembic schema migrations. Alembic comes with the first schema change, starting from a baseline that matches the existing database, so no data is lost.

Routes: `/`, `/organizations`, `/organizations/:id`, `/contacts`, `/contacts/:id`, `/deals`, `/deals/:id`, `/pipeline`. Any other address shows the not-found page (R1).

The pipeline board keeps a local copy of the columns while dragging, works out the column and board totals from that copy (R24), sends `move`, and on success replaces its copy with the server's data. On failure it puts the old copy back and shows an error.

### Visual design

The look follows Accountable's brand (the brand skill), which takes priority over any general design guidance. The layout is mockup D (`docs/mockups/d-dashboard.png` and `docs/mockups/d-pipeline.png`). The mockups show the layout and the look; the requirements decide what each screen does. The app differs from mockup D on purpose in three places: the board fills the window and each column scrolls (concern 9), Closed (Won) and Lost say "All time", and every card shows its probability, closed ones included (R20).

Light mode is the default, with dark mode as the agent's choice (R6a). The app is laid out for screens 1280px wide and up. Narrower windows down to 1024px still work, with tables scrolling sideways.

**Color tokens** (CSS variables in `tokens.css`). Every color the app draws comes from a token, charts included: style files and components name a token, never a color value. Light values sit on `:root` and dark values on `:root[data-theme="dark"]`, in the same file, so there are no overrides anywhere else. The light values are exactly the colors the app used before dark mode. Where it used several near-identical tints of one color, each keeps its own token, so light mode doesn't shift.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--page` | `#F0F4F5` | `#04232E` | Page background |
| `--panel` | `#FFFFFF` | `#000000` | Panels, cards, tables, dialogs, menus |
| `--soft` | `#E9EFF1` | `#0D2A33` | Inputs, row hover, light-gray fills |
| `--ink` | `#073B4C` Midnight | `#CDD8DB` Sea Mist | Headings and body text |
| `--ink-muted` | `#3E6370` | `#8FA9B1` | Secondary text, table headings (6.5:1 on white; 8.5:1 on black, 6.1:1 on `--soft`) |
| `--sea-green` | `#06D6A0` | same | Primary buttons (Midnight text), Closed (Won), won series |
| `--sea-green-text` | `#047A5C` | `#3DE3B8` | Small Sea Green text |
| `--marigold` | `#FFC145` | same | Expected revenue, upcoming follow-ups, second chart series |
| `--marigold-text` | `#8A5A00` | `#FFD27A` | Small Marigold text |
| `--coral` | `#F78C6B` | same | Third chart series, lost series in charts |
| `--coral-text` | `#B24A2A` | `#F9A58B` | Small Coral text |
| `--cerulean` | `#118AB2` | same | Information, links, open stages, revenue line |
| `--cerulean-text` | `#0E7193` | `#5CC1E3` | Small Cerulean text and links |
| `--raspberry` | `#EF476F` | same | Late deals, overdue follow-ups, delete buttons |
| `--raspberry-text` | `#C42D52` | `#F7849F` | Small Raspberry text |
| `--raspberry-wash` | `#FEF1F4` | `#26090F` | Overdue follow-up rows |
| `--raspberry-pill` | `#FDDDE5` | `#4A1424` | Overdue date pill |

Tints of Sea Green, Marigold, Coral and Cerulean (status chips, activity icon circles, avatars, the faded bars in the deals-won chart) take dark values of the same hue close to black: about `#073A2E`, `#3A2C0A`, `#3B1F16` and `#0A3341`. Chart axes, guide lines and the won and lost centre line use a muted token that's `#CDD8DB` in light mode and `#2E4A53` in dark. The dialog backdrop is Midnight at 35% in light mode and black at 60% in dark. Shadows stay soft and dark in both modes; on black panels they barely show, which is fine because the panels already stand off the navy page.

Every dark text token passes 4.5:1 on the dark page, on black, on `--soft` and on its own tint. Each measures at least 6:1 there; the lowest is `--ink-muted` on `--soft`. The rail (`--deep`, `--rail-text`) and the stage colors keep their light values in dark mode (concern 13).

**Stage colors** (concern 1): Cerulean tints for the open stages, each passing 4.5:1 with Midnight text: New Lead `#D0E8F0`, Qualified `#B1D8E5`, Showing `#93C9DB`, Offer `#76BBD2`, Under Contract `#58ADC9`. Closed (Won) is `#06D6A0` Sea Green and Lost is `#CDD8DB` Sea Mist, both with Midnight text.

**Type:**
- Instrument Sans for everything: page titles 30px semibold, with a small uppercase line above them (the date, or a count such as "18 open deals"); section titles 16px semibold; body 14px; table text 14px.
- JetBrains Mono for money, counts, percentages and dates in tables and tiles, with tabular figures so the columns line up. Wording such as "None yet" stays in Instrument Sans.
- Instrument Serif isn't used on any screen yet. It stays available for a tagline or quote later.

**Surfaces:** panels and cards are white on the `#F0F4F5` page (black on `#04232E` in dark mode), with 16px rounded corners for panels and 12px for cards, no outline, and a very soft shadow to lift them. No one-sided borders, no rule across the top of the page. Gradients aren't used, except that charts may use one soft fill under the revenue line. Table rows are separated by spacing and a faint row hover, not lines.

**Layout:**
- **Navigation rail**: 84px wide, Midnight in both modes, down the left of every page. It has the Sea Green "A" logo at the top and the five sections as an icon with a short label underneath (Dashboard, Orgs, Contacts, Deals, Pipeline). Icons and labels are Sea Mist. The current section has a slightly lighter Midnight tile behind it, with its icon in Sea Green. The dark mode button (R6a) sits alone at the bottom of the rail, in the same style.
- **Pages**: a header with the title and the main action on the right ("New contact").
- **Dashboard**: two areas side by side.
  - The main area, top to bottom:
    - the header: the date above the title, the summary line (R31) under it, and "Log activity" and "New deal" on the right;
    - the Midnight revenue panel (R32), about two thirds wide, beside the three figure cards stacked (R33). On the dark panel, figures are white, labels are Sea Mist, the change is a Coral pill, and the line is Sea Green with a light fill;
    - the sales funnel as horizontal bars, with the share moving on at the right of each row (R34), beside the won and lost chart (R34a);
    - the pipeline strip across the full width, with a legend giving each stage's value and count (R35).
  - A panel, 384px wide, on the right:
    - follow-ups at the top, grouped with small uppercase headings (R36). Overdue rows have a light Raspberry background and the due date in a Raspberry pill;
    - recent activity below, as a timeline: a tinted icon for each type, joined by a thin line.
- **Record pages**: details panel on the left (one third), timeline on the right (two thirds), with linked records under the details.
- **Pipeline**:
  - **Header:** the open-deal count above the title. On the right are a hint about keyboard dragging and "New deal".
  - **Summary panel** (R21): open value, expected revenue, the late count in Raspberry, and a thin strip with stage names lined up under their segments.
  - **Columns:** seven columns, each a rounded light-gray panel (dark gray-navy in dark mode) holding its heading, its cards and an "Add deal" button at the bottom. The board fills the window height, and each column scrolls on its own inside it, so its heading and totals stay in view (concern 9). The columns scroll sideways as a group on narrow screens. Closed (Won) and Lost columns are a shade closer to the page color, and their cards are a shade off the panel color with no shadow, so open deals stand out in both modes.
  - **Cards** (R20): the value is in full (`$585,000`). The five-dot probability meter is Cerulean. The late label is a Raspberry pill.
  - **Dragging:** while a card is being dragged, it tilts slightly, gains a Sea Green outline and a deeper shadow, and leaves a hatched gap where it came from.

**Writing:** short plain labels ("New deal", "Log activity", "Mark done"). No exclamation marks. Empty states say what's missing and offer the action ("No activities yet. Log one to start the timeline."). Confirmations are brief ("Deal saved"). Buttons that repeat on a page, such as each column's "Add deal" or each follow-up's "Mark done", have a name for screen readers that says which one they are.

### Testing

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
