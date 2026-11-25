# Organizations

The companies we work with. Part of the spec; the summary and index are in `docs/spec.md`.

## Requirements

- **R7** Fields:
  - name (required);
  - website;
  - industry (one of: Brokerage, Mortgage lending, Development, Property management, Relocation, Other);
  - notes.

  A website is shown without its `http://` or `https://`. Its link is the website as typed when it starts with `http://` or `https://` (in any case), and otherwise has `https://` added.
- **R8** Table columns: name, industry, website, number of contacts, number of open deals.
- **R9** The organization's page shows its details, a list of its contacts and a list of its deals. Each item links to its record's page.

## Data model

**organizations**: `name` text not null; `website` text; `industry` text, one of the R7 values; `notes` text.

## API

| Method and path | Purpose |
|---|---|
| `GET/POST /api/organizations` | List (with contact and open-deal counts), create |
| `GET/PATCH/DELETE /api/organizations/{id}` | One organization with its contacts and deals; update; delete |
| `GET /api/organizations/{id}/delete-impact` | `{contacts: 3, deals: 2}` for the delete dialog |
