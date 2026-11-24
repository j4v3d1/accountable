# Intent: dark mode

## Problem

Accountable only has a light mode, and some people prefer a dark screen.

## Proposed outcome

A dark mode with a toggle on every page, across every section. The toggle is an icon button with a short label at the bottom of the navigation rail, styled like the section links. Dark mode follows the brand skill: page background `#04232E`, black panels and cards, and colors lightened for small text on dark backgrounds.

## Constraints

- Light mode stays the default, and the app remembers the choice in the browser (localStorage), with no backend or database change. The saved mode is applied before the page paints, so there's no flash of light mode.
- Light mode looks exactly as it does today, apart from the toggle.
- Colors stay in one place, as tokens, with no scattered overrides.
- Text in dark mode meets the same contrast rules as spec.md.
- Charts, dialogs and messages follow the mode too.
- No new dependencies unless the plan makes the case for one.

## Not in this change

- Following the device's own dark mode setting.
- A layout for phones.

## Success criteria

1. npm run check passes.
2. A new end-to-end test proves that the toggle works and is remembered after a reload.
3. Screenshots of the dashboard and the pipeline in both modes are saved in docs/changes/dark-mode/.
4. A Playwright visual test compares every page in light mode against baseline screenshots taken before any CSS changes, and fails if light mode looks different apart from the toggle.
