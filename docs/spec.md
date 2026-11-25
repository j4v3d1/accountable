# Spec: Accountable

This is what Accountable is and does today, and how it's built. It's the first thing to read before any change. This file is the summary of the whole product, with an index. The detail lives in one file per area in `docs/specs/`. A change updates this file and the area files it affects so they describe the product as it will be once the change is merged.

The stack is in `docs/TECH_STACK.md`, and the look follows the brand skill (`.claude/skills/brand`).

## Problem

A small real estate business keeps track of its clients and property deals in spreadsheets, inboxes and people's heads. Nobody can see at a glance which companies we work with, who our buyers, sellers and leads are, what's in the deal pipeline, what happened last with a client or what needs doing next.

## The product

Accountable is a business management system: a sales CRM that will grow into a full Business OS, including ERP. Today it's a complete real estate sales CRM for a small team, shared on the web: a private Salesforce that does the everyday CRM essentials well, and feels sharp, modern and professional.

It's for a generic real estate business. It uses no real brokerage's name or branding, and its sample data is fictional.

### Who uses it

- A small real estate team, sharing one Accountable on the web. Everyone signs in with an email and password and works on the same organizations, contacts and deals. Everyone can do everything.
- People are added by hand in Supabase's dashboard. There's no sign-up.
- Supabase provides the sign-in and the database. No other systems are connected.

### At a glance

Five sections:

- **Dashboard**, the landing page: how sales are going at a glance, with revenue won by month, the open pipeline, a sales funnel, won and lost deals, follow-ups and recent activity.
- **Organizations**: the companies we work with, such as other brokerages, mortgage lenders, developers, property management firms and relocation firms.
- **Contacts**: the people we deal with: buyers, sellers and leads. A lead is a contact with the Lead status, so there's no separate list of leads.
- **Deals**: the property transactions, each with its stage, value, probability of close and close date.
- **Pipeline**: the deals as cards on a board, one column per stage, moved by dragging.

Four kinds of record: organizations, contacts, deals and activities (notes, calls and emails, with optional follow-ups, plus the stage changes the system logs). Most buyers and sellers are individuals, so a contact or deal doesn't need an organization. Each record shows who added it.

On every page, a top bar holds a search box that finds any organization, contact or deal by part of its name, and a menu under your initials with the theme (Light, Dark or System) and signing out.

### How it runs

- The team uses it at its `onrender.com` address. It runs on Render's free plan as one web service, with its data in Postgres on Supabase, so it needs an internet connection.
- `npm run dev` runs it on one computer with the sample data and made-up teammates, with no internet connection and without touching Supabase. `npm start` runs the built app on one computer the way Render does, against Supabase. Both work on Mac, Linux and Windows.
- Every change is kept: it's still there after a browser refresh and after a restart.
- One documented command resets the data to the sample data, and asks first when the database isn't the local file.

### Not built yet

- Roles and permissions: everyone can do everything.
- Sign-up, signing in with Google or magic links, and password reset.
- A history of every change. Each record keeps only who added it and who last changed it.
- Moving the data in a local SQLite file to Supabase. Supabase starts with the sample data.
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

## Index

Each area file holds that area's concerns, requirements and design (its tables, endpoints, backend rules and layout, where it has them).

| File | What's in it | Requirements | Concerns |
|---|---|---|---|
| `docs/specs/shared.md` | Navigation, the top bar, the user menu and its theme, list tables, forms, deleting, saving, how dates, money and probabilities are written | R1 to R6a | 10, 14 |
| `docs/specs/sign-in.md` | Signing in and out, Supabase and local sign-in, sessions, people and their names and initials, who added and last changed each record, the `users` table, the account endpoints | R49 to R57 | 16, 17, 18 |
| `docs/specs/search.md` | The search box, how it matches, its results and keyboard use, the search endpoint | R58 to R62 | 19 |
| `docs/specs/organizations.md` | Organizations: fields, table, record page, table and endpoints | R7 to R9 | |
| `docs/specs/contacts.md` | Contacts: fields, table and status filter, record page, table and endpoints | R10 to R12 | 11 |
| `docs/specs/deals.md` | Deals: fields, stages and probabilities, close dates, late deals, stage-change logging, table, endpoints and stage rules | R13 to R19 | 7 |
| `docs/specs/pipeline.md` | The board: columns, cards, summary, dragging, the `move` endpoint, positions, how the board works, the pipeline layout | R20 to R27 | 9 |
| `docs/specs/activities.md` | Activities and follow-ups: what an activity belongs to, stage-change entries, table and endpoints | R28 to R30 | 5, 6 |
| `docs/specs/dashboard.md` | The dashboard: summary line, revenue panel, figure cards, funnel, won and lost chart, pipeline strip, follow-ups, recent activity, the dashboard layout | R31 to R38 | 8, 12 |
| `docs/specs/running.md` | Running (`npm run dev` and `npm start`), which commands read `.env`, migrations, seeding and sample data, deploying to Render, tests and their speed, checks, the pre-commit hook, Claude Code hooks, CI, subagents, and the testing plan | R39 to R48, R63 to R66 | 4, 15, 23 |
| `docs/specs/architecture.md` | Architecture and the two ways it runs, settings, libraries, shared data model and API conventions, row-level security, SQLite and Postgres, the host check, code structure and its rules, routes | | 20, 21, 22 |
| `docs/specs/visual-design.md` | The brand look, color tokens in light and dark, stage colors, type, surfaces, the rail, top bar, search results, user menu, sign-in screen and page layout, writing | | 1, 2, 3, 13 |

### Concerns

These settle points where the brand, the platform or the data left a choice. Requirements and code comments refer to them by number, as in "concern 5". Each one is written out in its area file.

| Concern | Area file |
|---|---|
| 1. Stage colors | `visual-design.md` |
| 2. White text on Cerulean and Raspberry | `visual-design.md` |
| 3. Fonts offline | `visual-design.md` |
| 4. Setup before the one command | `running.md` |
| 5. What an activity belongs to | `activities.md` |
| 6. Stage-change entries | `activities.md` |
| 7. The close date when a deal is won or lost | `deals.md` |
| 8. What the sales funnel measures | `dashboard.md` |
| 9. Closed and Lost columns | `pipeline.md` |
| 10. How money is written | `shared.md` |
| 11. Contact status doesn't follow deals | `contacts.md` |
| 12. The dashboard's time window | `dashboard.md` |
| 13. Dark surfaces | `visual-design.md` |
| 14. Where the mode is kept | `shared.md` |
| 15. Proving light mode hasn't changed | `running.md` |
| 16. Two ways to sign in | `sign-in.md` |
| 17. How the backend checks a token | `sign-in.md` |
| 18. Who added the sample data | `sign-in.md` |
| 19. Case and special characters | `search.md` |
| 20. Supabase's Data API | `architecture.md` |
| 21. One set of queries for SQLite and Postgres | `architecture.md` |
| 22. The host check on Render | `architecture.md` |
| 23. Which commands read `.env` | `running.md` |

### Requirements

Each requirement has an ID, so tests and status notes can point at it. IDs are unique across all the area files, and the table above says which file holds each range.
