# Search

The search box in the top bar, which finds any organization, contact or deal by part of its name. Part of the spec; the summary and index are in `docs/spec.md`. The top bar itself is in `shared.md`.

## Concerns

- **19. Case and special characters.** Search lower-cases both the name and the search text and looks for one inside the other, with SQLAlchemy Core, so SQLite and Postgres give the same answer. SQLite only lower-cases the letters A to Z, so a name with an accented capital (such as "Élan Realty") matches "élan" on Postgres but not on SQLite. The sample data has no such names, and the live app runs on Postgres. `%`, `_` and `\` in the search text are matched as themselves, not as wildcards.

## Requirements

- **R58** A **search box** sits at the left of the top bar on every page: a search icon, the placeholder "Search organizations, contacts and deals", and the screen-reader name "Search". Results show once 2 or more characters are typed, about 200ms after typing stops.
- **R59** **Matching:** the text is trimmed, case doesn't matter, and it matches any part of:
  - an organization's name;
  - a contact's first name, last name, or first and last name together ("ana ru" finds Ana Ruiz);
  - a deal's name.
- **R60** **Results** open in a panel under the box, in three groups with small uppercase headings, in this order: Organizations, Contacts, Deals. Each group shows at most 5, names that start with the search text first, then the rest, each in alphabetical order. A group with no matches is left out. Each result shows:
  - an organization's name and industry;
  - a contact's name, with their status chip and organization;
  - a deal's name, with its stage chip and value.

  The matching part of each name is in semibold.
- **R61** The up and down arrows move through the results, Enter opens the highlighted one (the first, until the arrows are used), and Escape closes the panel. Clicking a result opens it too. Opening a result goes to its record page, clears the box and closes the panel.
- **R62** With no matches, the panel says: No matches for "<text>". While results load, it says "Searching...". If the search fails, it says "Couldn't search. Try again." The panel follows the color mode.

## API

| Method and path | Purpose |
|---|---|
| `GET /api/search?q=<text>` | `{organizations, contacts, deals}`, each at most 5 matches, ordered as in R60. Text shorter than 2 characters after trimming returns three empty lists; text longer than 100 characters is refused with 422 |

Each organization carries `id`, `name` and `industry`; each contact `id`, `first_name`, `last_name`, `status` and `organization_name`; each deal `id`, `name`, `stage` and `value`.
