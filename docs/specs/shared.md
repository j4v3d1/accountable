# Shared behavior

What every page and list has in common: navigation, tables, forms, deleting, saving, how values are written, and the dark mode button. Part of the spec; the summary and index are in `docs/spec.md`.

## Concerns

- **10. How money is written.** Amounts are US dollars, written as `$485,000`, with "USD" in the heading where the amount appears, such as "Value (USD)" or "Revenue won (USD)". Large amounts on chart axes and tiles are shortened, as in `$1.2M`.
- **14. Where the mode is kept.** The choice is saved in the browser's `localStorage` under `accountable-theme`, as `light` or `dark`. Anything else, or nothing, means light. It belongs to that browser on that computer: there's no backend setting, and `npm run seed` doesn't touch it. A small script in `index.html` reads it and marks the page before anything is drawn, so a dark page never flashes light on load.

## Requirements

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
