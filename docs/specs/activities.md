# Activities

Notes, calls and emails, with optional follow-ups, plus the stage changes the system logs. Part of the spec; the summary and index are in `docs/spec.md`.

## Concerns

- **5. What an activity belongs to.** Every activity belongs to exactly one contact or exactly one deal. A contact's timeline shows its own activities, plus the activities and stage changes of deals where they are the main contact, each labelled with the deal's name. Deleting a contact only deletes the activities that belong to the contact, so it never wipes history from their deals.
- **6. Stage-change entries.** A stage change is a fourth kind of activity, `stage_change`. Only the system creates them. They can't be edited or deleted by hand, and they're deleted with their deal.

## Requirements

- **R28** Fields:
  - type (Note, Call or Email);
  - description (required);
  - when it happened (date and time, default now);
  - follow-up date (optional);
  - done (only shown when there's a follow-up date).

  An activity belongs to one contact or one deal (concern 5).
- **R29** Activities are logged from the contact's or deal's page. The dashboard's "Log activity" asks first whether it's for a contact or a deal, and which one, from a searchable list. Each timeline entry shows an icon for its type, the description, the date, who added it (R57), and the follow-up date if there is one. Entries for note, call and email activities can be edited and deleted. Stage-change entries can't (concern 6).
- **R30** A follow-up that isn't done is **overdue** if its date is before today, and **upcoming** if it's today or later. It shows on the dashboard until it's marked done.

## Data model

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

## API

| Method and path | Purpose |
|---|---|
| `POST /api/activities` | Create, on a contact or deal |
| `PATCH/DELETE /api/activities/{id}` | Update, delete (refused with 409 for `stage_change`) |
