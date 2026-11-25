# Deals

The property transactions, with their stages, value, probability of close and close date. Part of the spec; the summary and index are in `docs/spec.md`. The board is in `pipeline.md`.

## Concerns

- **7. The close date when a deal is won or lost.** When a deal moves to Closed (Won) or Lost, its close date becomes today, so revenue counts in the month the deal was actually won. It can still be edited afterwards.

## Requirements

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
- **R18** The deal's page shows its details, who added and last changed it (R57), links to its contact and organization, its timeline newest first, and a "Log activity" button.
- **R19** Every stage change creates a `stage_change` activity on the deal, worded "Moved from Showing to Offer". This happens whether the change is made from the pipeline, the edit form or anywhere else.

## Data model

**deals**: `name` text not null; `contact_id` references contacts, **on delete set null**; `organization_id` references organizations, **on delete set null**; `stage` text not null, one of `new_lead`, `qualified`, `showing`, `offer`, `under_contract`, `closed_won` or `lost`; `value` integer not null (whole dollars); `probability` integer not null, 0 to 100; `close_date` date not null; `position` integer not null (order within the stage, 0 at the top); `notes` text.

The stage list, with labels and usual probabilities, lives in one backend module, `deals/stages.py`. The frontend gets it from `GET /api/stages`, so it's never written down twice.

## API

| Method and path | Purpose |
|---|---|
| `GET /api/stages` | Stage list in order, with label, usual probability and whether it's open |
| `GET/POST /api/deals` | List (with contact and organization names and a `late` flag), create |
| `GET/PATCH/DELETE /api/deals/{id}` | One deal with timeline; update; delete |
| `GET /api/deals/{id}/delete-impact` | `{activities: 7}` |

The `move` endpoint and the rules for positions are in `pipeline.md`.

Rules the backend applies:
- Creating or updating a deal with a new stage sets its probability to that stage's usual figure, unless the same request also sets the probability. A new stage also logs a stage change (R19) and, for Closed (Won) or Lost, sets the close date to today (R15).
