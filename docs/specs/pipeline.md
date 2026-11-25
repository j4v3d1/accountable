# Pipeline

The deals as cards on a board, one column per stage, moved by dragging. Part of the spec; the summary and index are in `docs/spec.md`. Deals themselves are in `deals.md`.

## Concerns

- **9. Closed and Lost columns.** The pipeline has one column per stage, so every deal ever won or lost appears on the board. All seven columns show all their deals, and each column scrolls on its own. The board's totals cover open deals only.

## Requirements

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

## API

| Method and path | Purpose |
|---|---|
| `POST /api/deals/{id}/move` | Body `{stage, index}`: put the deal at `index` in `stage`'s column. Returns every deal, so the board can replace its copy |

Rules the backend applies:
- `move` takes the deal out of its old column and inserts it at `index` in the new one. It renumbers `position` in both columns, in one transaction. A move within the same column changes the order only. An index past the end puts the deal last.
- A new deal goes to position 0 in its column, and the others move down one.

## How the board works

The pipeline board keeps a local copy of the columns while dragging, works out the column and board totals from that copy (R24), sends `move`, and on success replaces its copy with the server's data. On failure it puts the old copy back and shows an error.

## Layout

- **Pipeline**:
  - **Header:** the open-deal count above the title. On the right are a hint about keyboard dragging and "New deal".
  - **Summary panel** (R21): open value, expected revenue, the late count in Raspberry, and a thin strip with stage names lined up under their segments.
  - **Columns:** seven columns, each a rounded light-gray panel (dark gray-navy in dark mode) holding its heading, its cards and an "Add deal" button at the bottom. The board fills the window height below the top bar. Each column is as tall as its cards, up to the board's height, and then scrolls on its own inside it, so its heading and totals stay in view (concern 9). The columns scroll sideways as a group on narrow screens. Closed (Won) and Lost columns are a shade closer to the page color, and their cards are a shade off the panel color with no shadow, so open deals stand out in both modes.
  - **Cards** (R20): the value is in full (`$585,000`). The five-dot probability meter is Cerulean. The late label is a Raspberry pill.
  - **Dragging:** while a card is being dragged, it tilts slightly, gains a Sea Green outline and a deeper shadow, and leaves a hatched gap where it came from.
