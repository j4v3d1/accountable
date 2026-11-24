# Plan: dark mode

Built from `intent.md` and `docs/spec.md` (R6a, concerns 13 to 15, the color tokens). No new dependencies: the moon icon is Lucide's, and the visual test uses Playwright's own screenshot comparison.

## Files that change

**Frontend**

- `frontend/index.html`: a small inline script in `<head>` reads `localStorage["accountable-theme"]` and sets `data-theme="dark"` on `<html>` before the app loads, so there's no light flash (concern 14). Anything other than `dark` leaves the page light.
- `frontend/src/lib/theme.ts` (new): `readTheme()`, `saveTheme(mode)` and `applyTheme(mode)`. Reading falls back to light on a missing or unknown value, or when storage can't be read.
- `frontend/src/ui/ThemeToggle.tsx` (new): the rail button. Moon icon, label "Dark", accessible name "Dark mode", `aria-pressed` while dark, icon Sea Green when pressed (R6a).
- `frontend/src/ui/Rail.tsx` and `frontend/src/ui/layout.css`: the toggle sits alone at the bottom of the rail, styled like `.rail-link`. Two `#fff` values become tokens.
- `frontend/src/styles/tokens.css`: every color in the app becomes a token. Light values on `:root` stay exactly as they are today. Dark values go on `:root[data-theme="dark"]`, with `color-scheme: dark` so scrollbars, date pickers and other native controls turn dark too. New tokens cover the tints, chart axis lines, the dialog backdrop, the pipeline's column and card grays, and the hatched drag gap.
- Style files with color values today, changed to use tokens and nothing else:
  - `frontend/src/ui/ui.css`
  - `frontend/src/features/pipeline/pipeline.css`
  - `frontend/src/features/dashboard/dashboard.css`
  - `frontend/src/features/contacts/contacts.css`
  - `frontend/src/features/activities/activities.css`
- Components with color values today, changed to `var(--token)` strings, the way `FigureCards.tsx` already colors its current bar:
  - `frontend/src/features/dashboard/RevenuePanel.tsx`
  - `frontend/src/features/dashboard/WonLostChart.tsx`
  - `frontend/src/features/dashboard/FigureCards.tsx`
  - `frontend/src/lib/initials.ts` (avatar tints)

**Tests**

- `frontend/src/lib/theme.test.ts`, `frontend/src/ui/ThemeToggle.test.tsx` (new). `frontend/src/ui/Rail.test.tsx` gets one more test.
- `frontend/src/styles/tokens.test.ts` (new): the color guard and the contrast check (see Proof).
- `e2e/theme.spec.ts` (new): the toggle, and dark mode kept after a reload.
- `e2e/light-mode.spec.ts` (new), with its baseline screenshots in `e2e/light-mode.spec.ts-snapshots/`: one PNG per page for Mac (`-darwin`) and one for Linux (`-linux`).
- `playwright.config.ts` and `e2e/fixtures.ts`: fix today's date for the whole end-to-end run (concern 15). `ACCOUNTABLE_TODAY` goes to the backend server and to the reseed, the browser's clock is set to noon on the same day with `page.clock.setFixedTime`, and the time zone is fixed with `timezoneId`. Mac and the Linux runner have different time zones, and the seed's activity times are local.

**CI and docs**

- `.github/workflows/ci.yml`: the failure upload also includes `e2e/**/*-snapshots/`. That's how the Linux baselines come back from the first run.
- `docs/STATUS.md`: a line for this change once it's done. `docs/spec.md` is already updated.
- `docs/changes/dark-mode/`: the four screenshots for success criterion 3.

## Order of work

**Phase 1: lock light mode before changing any CSS**

1. Fix today's date, the clock and the time zone for the end-to-end run (`playwright.config.ts`, `e2e/fixtures.ts`). Run `npm test` and fix any existing end-to-end test that depended on the real date, without weakening it.
2. Write `e2e/light-mode.spec.ts`: each route (`/`, `/organizations`, `/organizations/1`, `/contacts`, `/contacts/1`, `/deals`, `/deals/1`, `/pipeline`, a not-found address) plus an open delete dialog. It uses full-page `toHaveScreenshot` with animations off and the toggle masked (the mask has no effect until the toggle exists). Before saving, check that every record ID it opens exists in the sample data.
3. Make the Mac baselines with `npx playwright test e2e/light-mode.spec.ts --update-snapshots`. Run it twice to show they're stable.
4. Add the snapshot folder to the CI failure upload. You push this state to your fork. CI fails because the Linux baselines are missing, and Playwright writes them. Download them from the run's artifact into the snapshot folder. Push again and check CI passes.

**Phase 2: move every color into tokens, light mode only**

5. Write the color guard in `tokens.test.ts` and watch it fail on today's code.
6. Move each color value into a token, one file at a time, and run the light-mode visual test after each file. It must stay green; any difference means a token's value is wrong.
7. The guard passes. Light mode is now known to look exactly as before.

**Phase 3: dark tokens**

8. Write the contrast check in `tokens.test.ts` and watch it fail (there are no dark values yet).
9. Add the dark block to `tokens.css`, using the spec's table and concern 13: rail, revenue panel, stage colors and solid brand fills keep their values.
10. Set `data-theme="dark"` by hand in the browser and go through every page, dialog, menu, picker, toast and chart. Fix anything that's still light: that's a color that missed Phase 2. Write a guard test for it, then fix it.

**Phase 4: the toggle**

11. Write `theme.test.ts`, `ThemeToggle.test.tsx` and the Rail test, and watch them fail.
12. Build `lib/theme.ts`, `ThemeToggle.tsx`, its place in the rail and the inline script in `index.html`.
13. Write `e2e/theme.spec.ts` and get it passing. Run the light-mode visual test again: the toggle is masked, so it must still pass.

**Phase 5: finish**

14. `npm run check` passes.
15. With Playwright, take screenshots of the dashboard and the pipeline in both modes into `docs/changes/dark-mode/` (`dashboard-light.png`, `dashboard-dark.png`, `pipeline-light.png`, `pipeline-dark.png`).
16. Go through the app by eye in Chrome in both modes, with the console clear. Update `docs/STATUS.md`.

## Risks

- **Fixing the date for the whole run could break existing end-to-end tests.** Some may assume the real today, such as logging an activity "now" or a follow-up due this week. Step 1 runs them all before anything else changes, so any break shows up straight away.
- **Linux baselines can only come from CI.** Step 4 depends on you pushing and downloading the artifact. If a later change to a light page is intended, the Linux baselines have to be refreshed the same way.
- **Screenshots can flicker.** Fonts loading late, chart animations, the blinking text cursor or hover states can make one run differ from the next. The test waits for `document.fonts.ready`, turns animations off and moves the mouse away. Step 3 runs it twice to prove the baselines are stable before anything relies on them.
- **Recharts and CSS variables.** Charts get colors as `var(--token)` strings in SVG attributes. That already works in `FigureCards.tsx`, but gradient stops in the revenue panel's fill need checking in step 10.
- **Colors that aren't hex.** The guard looks for `#hex`, `rgb()`/`rgba()`, `hsl()` and the keywords `white` and `black`. A color hidden in an SVG file or an inline `style` would slip past, so step 10's walk-through is the backstop.
- **Black panels on a navy page.** Shadows barely show on black. The spec accepts this, but if cards don't separate clearly by eye in step 10, raise it rather than adding outlines (the brand says no outlines).

## Proof

**Unit tests (Vitest)**

- `lib/theme.test.ts`: a missing value reads as light; an unknown value reads as light; `dark` reads as dark; a storage error reads as light; saving writes `accountable-theme`; applying dark sets `data-theme="dark"` and applying light removes it.
- `ui/ThemeToggle.test.tsx`: the button is named "Dark mode"; it isn't pressed in light mode; pressing it turns dark mode on, saves it and shows as pressed; pressing again goes back to light.
- `ui/Rail.test.tsx`: the rail contains the Dark mode button.
- `styles/tokens.test.ts`:
  - **color guard**: no file in `frontend/src` except `tokens.css` contains a color value (the patterns in Risks). This proves "colors stay in one place".
  - **contrast**: reads the light and dark values from `tokens.css` and checks every text token against the surfaces it sits on, in both modes. Body text needs 4.5:1, and white on Cerulean and Raspberry needs 3:1 (concern 2). This proves the contrast rule holds in dark mode.

**End-to-end tests (Playwright)**

- `e2e/theme.spec.ts`:
  - the app opens in light mode, and the Dark mode button shows on every route;
  - pressing it turns the page dark straight away (the page background is `#04232E`) and shows the button as pressed;
  - after a reload, the page is still dark, and `<html>` already has `data-theme="dark"` at `domcontentloaded`, before the app draws;
  - pressing it again goes back to light, and light stays after a reload;
  - a dialog and the dashboard's charts follow dark mode.
- `e2e/light-mode.spec.ts`: every page in light mode matches its baseline, with the toggle masked (concern 15).

**By hand**

- The four screenshots in `docs/changes/dark-mode/`, and the walk-through in Chrome in both modes with the console clear.
