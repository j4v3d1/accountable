# Spec: the Accountable MVP

This spec turns `docs/intent.md` into requirements and a design that can be built and tested. The stack is in `docs/TECH_STACK.md`, and the look follows the brand skill (`.claude/skills/brand`). Where this spec and the intent disagree, the intent wins. Fix this spec when that happens.

## Concerns (agreed)

These are the points where the intent or the brand leaves a gap, or where two of them pull in different directions. Each decision below was agreed on 2026-11-23 and is part of the requirements. This is an MVP: when in doubt, build the simplest thing that meets the requirement.

1. **Seven stages, five brand colors.** The brand says to color things that sit side by side Sea Green, Marigold, Coral, Cerulean and Raspberry, in that order. That's five colors, and there are seven stages. The brand's order would also make Under Contract Raspberry, which is the alert color.
   *Agreed:* the five open stages share one Cerulean scale, light to deep. Closed (Won) is Sea Green and Lost is a muted gray. Raspberry is kept for late deals and overdue follow-ups. Chart series that aren't stages follow the brand's order.
2. **White text on Cerulean and Raspberry is hard to read at small sizes.** It measures 3.96:1 on Cerulean and 3.62:1 on Raspberry. WCAG AA needs 4.5:1 for normal text.
   *Agreed:* white-on-color is only used for text at least 14px and semibold, which needs only 3:1, such as buttons and badges. Small text in these colors uses the darker shades in the color tokens below.
3. **Offline and Google Fonts.** The intent says the app needs no internet connection, and the brand's fonts come from Google Fonts.
   *Agreed:* the fonts are installed as npm packages (`@fontsource-variable/instrument-sans`, `@fontsource/instrument-serif`, `@fontsource-variable/jetbrains-mono`) and served with the app. Nothing loads from a CDN.
4. **"One command" still needs Node.js and uv installed.** A non-technical person has to install both before `npm run dev` works, and `npm install` has to run once.
   *Agreed:* `docs/STATUS.md` lists those two installs and the first-time `npm install` as setup steps. `npm run dev` then runs `uv sync` itself before it starts the backend, so there's no separate Python step.
5. **What an activity belongs to.** The intent says an activity relates to "the contact or deal". If it could belong to both, the rule "deleting a contact deletes their activities" would also wipe history from deals the contact was on.
   *Agreed:* every activity belongs to exactly one contact or exactly one deal. A contact's timeline shows its own activities, plus the activities and stage changes of deals where they are the main contact, each labelled with the deal's name. Deleting a contact only deletes the activities that belong to the contact.
6. **Stage-change entries.** The intent asks for automatic timeline entries such as "Moved from Showing to Offer", but activity types are only note, call and email.
   *Agreed:* a stage change is a fourth kind of activity, `stage_change`. Only the system creates them. They can't be edited or deleted by hand, and they're deleted with their deal.
7. **The close date when a deal is won or lost.** Revenue won by month depends on the close date. A deal moved to Closed (Won) in November with an expected close date in January would count in January.
   *Agreed:* when a deal moves to Closed (Won) or Lost, its close date becomes today. It can still be edited afterwards.
8. **What the sales funnel measures.** "How much value reaches each stage" can't be worked out for lost deals from their current stage alone, because they all sit in Lost.
   *Agreed:* the funnel uses each deal's furthest stage, taken from its stage-change history. A deal counts in every stage up to and including its furthest one. The sample data creates matching stage-change history.
9. **Closed and Lost columns grow forever.** The pipeline has one column per stage, so every deal ever won or lost appears on the board.
   *Agreed:* for the MVP, all seven columns show all their deals, and each column scrolls on its own. Hiding old closed deals can be added later. The board's totals cover open deals only, as the intent says.
10. **How money is written.** The brand says money is always shown with its currency, and the intent says US dollars only.
    *Agreed:* amounts are written as `$485,000`, with "USD" in the heading where the amount appears, such as "Value (USD)" or "Revenue won (USD)". Large amounts on chart axes and tiles are shortened, as in `$1.2M`.
11. **Contact status doesn't follow deals.** A contact stays a lead after their deal closes unless someone changes it by hand. The intent doesn't ask for anything automatic, so nothing changes their status on its own.
12. **The dashboard's time window.** The sample data covers six months back. The charts show the last six calendar months, including the current one.

## Requirements

Each requirement has an ID, so tests and status notes can point at it.

### Shared behavior

- **R1** The app opens on the Dashboard. A navigation rail on the left links to Dashboard, Organizations, Contacts, Deals and Pipeline, and marks the current section.
- **R2** Every list page (Organizations, Contacts, Deals) has a table with:
  - a search box that filters rows as you type, matching any text column;
  - column headings that sort when clicked (ascending, then descending, then back to the default order);
  - a "New" button that opens a form;
  - edit and delete actions on each row.

  Clicking a row opens the record's page.
- **R3** Forms check that required fields are filled in and that emails and websites look valid. They show errors next to the field. Saving closes the form, updates the table straight away, and shows a short confirmation.
- **R4** Delete asks first, in a dialog that names the record and gives counts of what will happen to linked records. Zero counts are left out. The rules:
  - Organization: its contacts and deals are kept and unlinked ("3 contacts and 2 deals will be unlinked").
  - Contact: their deals are kept with no main contact, and their activities are deleted ("2 deals will be unlinked, 5 activities will be deleted").
  - Deal: its activities are deleted, including stage changes ("7 activities will be deleted").
- **R5** Every change is saved to the database straight away. It's still there after a refresh and after a restart.
- **R6** Dates are shown as `Nov 23, 2026`. Money follows concern 10. Probabilities are shown as `60%`.

### Organizations

- **R7** Fields:
  - name (required);
  - website;
  - industry (one of: Brokerage, Mortgage lending, Development, Property management, Relocation, Other);
  - notes.
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
- **R11** Table columns: name, status, organization, email, phone, last activity date. A status filter (All, Lead, Qualified, Customer) sits next to the search box and works together with it.
- **R12** The contact's page shows:
  - their details and a link to their organization;
  - their deals;
  - their timeline (see concern 5), newest first;
  - a "Log activity" button.

### Deals

- **R13** Fields:
  - name (required);
  - main contact and organization (both optional, each chosen from a searchable list);
  - stage (required, default New Lead);
  - value (whole US dollars, 0 or more, required);
  - probability (0 to 100, whole number);
  - close date (required);
  - notes.
- **R14** Choosing a stage, or moving a deal to a new stage, sets its probability to that stage's usual figure (see the intent's stage table). A probability typed by hand is kept until the stage changes again.
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
  - the total value and expected revenue of all open deals (every stage except Closed (Won) and Lost);
  - the number of late deals;
  - a thin strip of open value by stage.
- **R22** Dragging a card to another column changes the deal's stage. R14, R15 and R19 apply.
- **R23** A card can be dropped at any place in any column, including higher or lower in its own column. It stays at that place after a refresh.
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
- **R29** Activities are logged from the contact's or deal's page. Each timeline entry shows an icon for its type, the description, the date, and the follow-up date if there is one. Entries for note, call and email activities can be edited and deleted. Stage-change entries can't (concern 6).
- **R30** A follow-up that isn't done is **overdue** if its date is before today, and **upcoming** if it's today or later.

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
- **R41** `npm run seed` deletes everything and loads the sample data again.
- **R42** The sample data matches the intent: a fictional US metro area, about 12 organizations, 40 contacts, 30 deals and 80 activities, with stage-change history for deals past New Lead. All dates are worked out relative to the day the seed runs, so the data never looks stale: closed deals over the past six months, open deals closing in the months ahead, 3 or 4 late deals, and follow-ups both overdue and due soon. Names are invented and use reserved domains such as `example.com`. The data is built from a fixed random seed, so every reset gives the same result.
- **R43** `npm test` runs the Vitest, pytest and Playwright tests against a database of their own, and fails if any test fails.

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
- Each API request runs in one database transaction, so a change either saves completely or not at all.
- The API only answers requests addressed to `localhost` or `127.0.0.1`, so a web page can't reach it by pointing its own domain name at this computer (DNS rebinding).

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
| Searchable pickers (choosing a contact or organization) | `cmdk`, inside a Radix Popover |
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

The stage list, with labels and usual probabilities, lives in one backend module. The frontend gets it from `GET /api/stages`, so it's never written down twice.

### API

All responses are JSON. Errors use FastAPI's standard shape, with status 404 for missing records and 422 for invalid input.

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
| `POST /api/deals/{id}/move` | Body `{stage, index}`: put the deal at `index` in `stage`'s column |
| `POST /api/activities` | Create, on a contact or deal |
| `PATCH/DELETE /api/activities/{id}` | Update, delete (refused with 409 for `stage_change`) |
| `GET /api/dashboard` | Everything the dashboard shows, in one response |

Rules the backend applies:
- Creating or updating a deal with a new stage sets its probability to that stage's usual figure, unless the same request also sets the probability. A new stage also logs a stage change (R19) and, for Closed (Won) or Lost, sets the close date to today (R15).
- `move` takes the deal out of its old column and inserts it at `index` in the new one. It renumbers `position` in both columns, in one transaction. A move within the same column changes the order only.
- A new deal goes to position 0 in its column, and the others move down one.

### Code structure

The code is grouped by area of the product, not by technical layer, so a new area (such as invoicing) is a new folder on each side and nothing else has to move.

```
backend/app/
  main.py              creates the app and adds each area's routes
  core/
    config.py          database URL, today(), allowed hosts
    db.py              engine, one transaction per request
    tables.py          all tables, in one place
    errors.py          404, 409 and 422 errors, raised by services
    fields.py          field types shared by the request schemas
  organizations/       routes.py, schemas.py, service.py
  contacts/            routes.py, schemas.py, service.py
  deals/               routes.py, schemas.py, service.py, stages.py
  activities/          routes.py, schemas.py, service.py
  dashboard/           routes.py, schemas.py, service.py
  seed.py              the sample data, and the reset command

frontend/src/
  main.tsx, App.tsx    providers and routes
  api/client.ts        the one fetch wrapper and its error type
  ui/                  app-wide pieces: Rail, PageHeader, DataTable, ConfirmDeleteDialog,
                       Toast, form fields, RecordPicker, Avatar, empty/loading/error states
  lib/                 formatting (money, dates, percent) and initials
  features/
    organizations/     pages, form, query hooks, types
    contacts/          pages, form, query hooks, types
    deals/             pages, form, query hooks, types, StageChip, LateBadge, ProbabilityDots
    activities/        Timeline, ActivityForm, query hooks, types
    pipeline/          Board, Column, DealCard, BoardSummary, PipelineStrip, board logic
    dashboard/         the dashboard page and its panels
  styles/              tokens.css (brand variables), base.css
```

Rules that keep it this way:

- Route files are thin. They check the request, call one function in their area's `service.py`, and return the result.
- Services are plain functions that take the request's database connection, and later the signed-in user. There are no repository classes, no ORM models and no dependency-injection framework.
- `core/`, `ui/` and `lib/` never import from an area. Areas may call each other where they need to; for example, deals calls activities to log a stage change.
- Frontend types are written by hand, one `types.ts` per area. After any change to data, the frontend refreshes all its queries, which keeps every screen current, the dashboard included (R38).
- Left out on purpose until they pay off: API versioning, types generated from the API, and Alembic schema migrations. Alembic comes with the first schema change after the MVP, starting from a baseline that matches the existing database, so no data is lost.

Routes: `/`, `/organizations`, `/organizations/:id`, `/contacts`, `/contacts/:id`, `/deals`, `/deals/:id`, `/pipeline`.

The pipeline board keeps a local copy of the columns while dragging, works out the column and board totals from that copy (R24), sends `move`, and on success replaces its copy with the server's data. On failure it puts the old copy back and shows an error.

### Visual design

The chosen direction is mockup D (`docs/mockups/d-dashboard.png` and `docs/mockups/d-pipeline.png`), a refined version of C. The mockups show the layout and the look. The requirements above still decide what each screen does.

Light mode only, laid out for screens 1280px wide and up. Narrower windows down to 1024px still work, with tables scrolling sideways.

**Color tokens** (CSS variables in `tokens.css`):

| Token | Value | Use |
|---|---|---|
| `--page` | `#F0F4F5` | Page background |
| `--panel` | `#FFFFFF` | Panels, cards, tables, dialogs |
| `--ink` | `#073B4C` Midnight | Headings and body text |
| `--ink-muted` | `#3E6370` | Secondary text, table headings (6.5:1 on white) |
| `--sea-green` | `#06D6A0` | Primary buttons (Midnight text), Closed (Won), won series |
| `--sea-green-text` | `#047A5C` | Small Sea Green text on light backgrounds |
| `--marigold` | `#FFC145` | Expected revenue, upcoming follow-ups, second chart series |
| `--marigold-text` | `#8A5A00` | Small Marigold text |
| `--coral` | `#F78C6B` | Third chart series, lost series in charts |
| `--coral-text` | `#B24A2A` | Small Coral text |
| `--cerulean` | `#118AB2` | Information, links, open stages, revenue line |
| `--cerulean-text` | `#0E7193` | Small Cerulean text and links |
| `--raspberry` | `#EF476F` | Late deals, overdue follow-ups, delete buttons |
| `--raspberry-text` | `#C42D52` | Small Raspberry text |

**Stage colors** (concern 1): Cerulean tints for the open stages, each passing 4.5:1 with Midnight text: New Lead `#D0E8F0`, Qualified `#B1D8E5`, Showing `#93C9DB`, Offer `#76BBD2`, Under Contract `#58ADC9`. Closed (Won) is `#06D6A0` Sea Green and Lost is `#CDD8DB` Sea Mist, both with Midnight text.

**Type:**
- Instrument Sans for everything: page titles 30px semibold, with a small uppercase line above them (the date, or a count such as "18 open deals"); section titles 16px semibold; body 14px; table text 14px.
- JetBrains Mono for money, counts, percentages and dates in tables and tiles, with tabular figures so the columns line up.
- Instrument Serif isn't used on the MVP screens, because direction D has no tagline. It stays available for a tagline or quote later.

**Surfaces:** panels and cards are white on the `#F0F4F5` page, with 16px rounded corners for panels and 12px for cards, no outline, and a very soft shadow to lift them. No one-sided borders, no rule across the top of the page. Gradients aren't used, except that charts may use one soft fill under the revenue line. Table rows are separated by spacing and a faint row hover, not lines.

**Layout:**
- **Navigation rail**: 84px wide, Midnight, down the left of every page. It has the Sea Green "A" logo at the top and the five sections as an icon with a short label underneath (Dashboard, Orgs, Contacts, Deals, Pipeline). Icons and labels are Sea Mist. The current section has a slightly lighter Midnight tile behind it, with its icon in Sea Green.
- **Pages**: a header with the title and the main action on the right ("New contact").
- **Dashboard**: two areas side by side.
  - The main area, top to bottom:
    - the header: the date above the title, the summary line (R31) under it, and "Log activity" and "New deal" on the right;
    - the Midnight revenue panel (R32), about two thirds wide, beside the three white figure cards stacked (R33). On the dark panel, figures are white, labels are Sea Mist, the change is a Coral pill, and the line is Sea Green with a light fill;
    - the sales funnel as horizontal bars, with the share moving on at the right of each row (R34), beside the won and lost chart (R34a);
    - the pipeline strip across the full width, with a legend giving each stage's value and count (R35).
  - A white panel, 384px wide, on the right:
    - follow-ups at the top, grouped with small uppercase headings (R36). Overdue rows have a light Raspberry background and the due date in a Raspberry pill;
    - recent activity below, as a timeline: a tinted icon for each type, joined by a thin line.
- **Record pages**: details panel on the left (one third), timeline on the right (two thirds), with linked records under the details.
- **Pipeline**:
  - **Header:** the open-deal count above the title. On the right are a hint about keyboard dragging and "New deal".
  - **Summary panel** (R21): open value, expected revenue, the late count in Raspberry, and a thin strip with stage names lined up under their segments.
  - **Columns:** seven columns, each a rounded light-gray panel holding its heading, its cards and an "Add deal" button at the bottom. The board fills the window height, and each column scrolls on its own inside it, so its heading and totals stay in view (concern 9). The columns scroll sideways as a group on narrow screens. Closed (Won) and Lost columns are a shade lighter, and their cards are off-white with no shadow, so open deals stand out.
  - **Cards** (R20): the value is in full (`$585,000`). The five-dot probability meter is Cerulean. The late label is a Raspberry pill.
  - **Dragging:** while a card is being dragged, it tilts slightly, gains a Sea Green outline and a deeper shadow, and leaves a hatched gap where it came from.

**Writing:** short plain labels ("New deal", "Log activity", "Mark done"). No exclamation marks. Empty states say what's missing and offer the action ("No activities yet. Log one to start the timeline."). Confirmations are brief ("Deal saved").

### Testing

- **Backend (pytest)**:
  - stage probability rules (R14), the close date on won or lost (R15), stage-change logging (R19);
  - the `move` endpoint ordering (R23);
  - delete rules and delete-impact counts (R4);
  - each dashboard figure against hand-worked data (R31 to R38);
  - the seed's counts and spread (R42).
- **Frontend (Vitest)**: money, date and percent formatting; the late-deal check; the drag-time totals; form validation.
- **End to end (Playwright with installed Chrome)**: the app starts against a fresh test database. These flows are covered:
  - create, search, sort, edit and delete for each list, with refresh checks;
  - the status filter;
  - drag across and within columns, with a refresh check;
  - add a deal in a column;
  - log an activity with a follow-up and mark it done on the dashboard;
  - the dashboard updates after a deal is won;
  - no console errors on any page.
- Success criterion 8 (a person using it end to end and checking each screen by eye) is a manual step before the MVP is called done. Tests don't replace it.

### Out of scope

As listed in the intent's constraints. Also not in the MVP: undo, bulk actions, pagination (the data is small), and filters other than contact status.
