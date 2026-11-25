# Shared behavior

What every page and list has in common: navigation, the top bar, the user menu and its color mode, tables, forms, deleting, saving, and how values are written. Part of the spec; the summary and index are in `docs/spec.md`.

## Concerns

- **10. How money is written.** Amounts are US dollars, written as `$485,000`, with "USD" in the heading where the amount appears, such as "Value (USD)" or "Revenue won (USD)". Large amounts on chart axes and tiles are shortened, as in `$1.2M`.
- **14. Where the mode is kept.** The choice is saved in the browser's `localStorage` under `accountable-theme`, as `light`, `dark` or `system`. Anything else, or nothing, means system, so a browser with no saved choice follows the device, and a `light` or `dark` saved before the user menu existed stays as it was. System follows the device's `prefers-color-scheme` setting and changes as soon as the device does, without a reload. The choice belongs to that browser on that computer: there's no backend setting, it isn't tied to the person signed in, and `npm run seed` doesn't touch it. A small script in `index.html` reads it, works out light or dark, and marks the page before anything is drawn, so a dark page never flashes light on load. The sign-in screen follows the same choice.

## Requirements

- **R1** Once signed in (R49), the app opens on the Dashboard. A navigation rail on the left links to Dashboard, Organizations, Contacts, Deals and Pipeline, and marks the current section. A **top bar** runs across the top of every page, to the right of the rail, with the search box on the left (R58) and the user menu on the right (R6a). An address that matches no page shows "Page not found" with a link to the dashboard.
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
- **R6a** The **user menu** is a round button at the right of the top bar showing the signed-in person's initials (R55), with the screen-reader name "Account menu". It opens a menu with:
  - the person's name, and their email under it in smaller muted text (just the email when they have no name);
  - **Theme**, with three choices, Light, Dark and System, as radio items with the current one ticked. Choosing one switches every page at once, without a reload. Charts, dialogs, menus, pickers and confirmations follow the mode. The choice is remembered after a reload or restart (concern 14);
  - **Sign out** (R53).

  The menu works with the keyboard: Enter or space opens it, the arrow keys move through it, and Escape closes it. The rail no longer has a dark mode button.
