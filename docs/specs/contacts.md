# Contacts

The people we deal with: buyers, sellers and leads. Part of the spec; the summary and index are in `docs/spec.md`.

## Concerns

- **11. Contact status doesn't follow deals.** A contact stays a lead after their deal closes unless someone changes it by hand. Nothing changes a status on its own.

## Requirements

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

## Data model

**contacts**: `first_name` and `last_name` text not null; `email`, `phone`, `job_title` text; `organization_id` references organizations, **on delete set null**; `status` text not null, one of `lead`, `qualified` or `customer`.

## API

| Method and path | Purpose |
|---|---|
| `GET/POST /api/contacts` | List (with organization name and last activity date), create |
| `GET/PATCH/DELETE /api/contacts/{id}` | One contact with organization, deals and timeline; update; delete |
| `GET /api/contacts/{id}/delete-impact` | `{deals: 2, activities: 5}` |
