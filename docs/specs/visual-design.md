# Visual design

The look across every page: colors and tokens, dark mode, type, surfaces, the shared layout and the writing. Part of the spec; the summary and index are in `docs/spec.md`. The dashboard's layout is in `dashboard.md` and the pipeline's in `pipeline.md`.

## Concerns

- **1. Stage colors.** The brand colors things that sit side by side Sea Green, Marigold, Coral, Cerulean and Raspberry, in that order. That's five colors for seven stages, and the order would make Under Contract Raspberry, the alert color. So the five open stages share one Cerulean scale, light to deep. Closed (Won) is Sea Green and Lost is a muted gray. Raspberry is kept for late deals and overdue follow-ups. Chart series that aren't stages follow the brand's order.
- **2. White text on Cerulean and Raspberry.** It measures 3.96:1 on Cerulean and 3.62:1 on Raspberry, below the 4.5:1 WCAG AA needs for normal text. White-on-color is only used for text at least 14px and semibold, which needs only 3:1, such as buttons and badges. Small text in these colors uses the darker shades in the color tokens below. In dark mode, small colored text uses the lighter shades instead, and every text token passes 4.5:1 on the dark page, panels and tints (concern 13).
- **3. Fonts offline.** The brand's fonts come from Google Fonts, but the app works offline. The fonts are installed as npm packages (`@fontsource-variable/instrument-sans`, `@fontsource/instrument-serif`, `@fontsource-variable/jetbrains-mono`) and served with the app. Nothing loads from a CDN.
- **13. Dark surfaces.** The brand gives dark mode a `#04232E` page with black panels and cards, and Sea Mist ink. Three things keep their light-mode colors in dark mode:
    - the navigation rail and the dashboard's revenue panel stay Midnight `#073B4C`. They're already dark and read correctly on both pages;
    - the stage colors and the solid brand fills (buttons, chart series, badges) stay the same, with the same text on them, so a color means the same thing in both modes;
    - white text stays on Cerulean and Raspberry, under the same 14px semibold rule (concern 2).

    Everything else that sits on a panel, such as tinted chips, icon circles, avatars, row washes, hover rows and chart axes, has its own dark value.

## Design

The look follows Accountable's brand (the brand skill), which takes priority over any general design guidance. The layout is mockup D (`docs/mockups/d-dashboard.png` and `docs/mockups/d-pipeline.png`). The mockups show the layout and the look; the requirements decide what each screen does. The app differs from mockup D on purpose in three places: the board fills the window and each column scrolls (concern 9), Closed (Won) and Lost say "All time", and every card shows its probability, closed ones included (R20).

A browser with no saved choice follows the device's light or dark setting (System), and Light or Dark can be chosen in the user menu (R6a, concern 14). The app is laid out for screens 1280px wide and up. Narrower windows down to 1024px still work, with tables scrolling sideways.

**Color tokens** (CSS variables in `tokens.css`). Every color the app draws comes from a token, charts included: style files and components name a token, never a color value. Light values sit on `:root` and dark values on `:root[data-theme="dark"]`, in the same file, so there are no overrides anywhere else. The light values are exactly the colors the app used before dark mode. Where it used several near-identical tints of one color, each keeps its own token, so light mode doesn't shift.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--page` | `#F0F4F5` | `#04232E` | Page background |
| `--panel` | `#FFFFFF` | `#000000` | Panels, cards, tables, dialogs, menus |
| `--soft` | `#E9EFF1` | `#0D2A33` | Inputs, row hover, light-gray fills |
| `--ink` | `#073B4C` Midnight | `#CDD8DB` Sea Mist | Headings and body text |
| `--ink-muted` | `#3E6370` | `#8FA9B1` | Secondary text, table headings (6.5:1 on white; 8.5:1 on black, 6.1:1 on `--soft`) |
| `--sea-green` | `#06D6A0` | same | Primary buttons (Midnight text), Closed (Won), won series |
| `--sea-green-text` | `#047A5C` | `#3DE3B8` | Small Sea Green text |
| `--marigold` | `#FFC145` | same | Expected revenue, upcoming follow-ups, second chart series |
| `--marigold-text` | `#8A5A00` | `#FFD27A` | Small Marigold text |
| `--coral` | `#F78C6B` | same | Third chart series, lost series in charts |
| `--coral-text` | `#B24A2A` | `#F9A58B` | Small Coral text |
| `--cerulean` | `#118AB2` | same | Information, links, open stages, revenue line |
| `--cerulean-text` | `#0E7193` | `#5CC1E3` | Small Cerulean text and links |
| `--raspberry` | `#EF476F` | same | Late deals, overdue follow-ups, delete buttons |
| `--raspberry-text` | `#C42D52` | `#F7849F` | Small Raspberry text |
| `--raspberry-wash` | `#FEF1F4` | `#26090F` | Overdue follow-up rows |
| `--raspberry-pill` | `#FDDDE5` | `#4A1424` | Overdue date pill |
| `--selected` | `#073B4C` | `#CDD8DB` | The highlighted option in pickers and search results |
| `--on-selected` | `#FFFFFF` | `#073B4C` | Text on `--selected` |

Tints of Sea Green, Marigold, Coral and Cerulean (status chips, activity icon circles, avatars, the faded bars in the deals-won chart) take dark values of the same hue close to black: about `#073A2E`, `#3A2C0A`, `#3B1F16` and `#0A3341`. Chart axes, guide lines and the won and lost centre line use a muted token that's `#CDD8DB` in light mode and `#2E4A53` in dark. The dialog backdrop is Midnight at 35% in light mode and black at 60% in dark. Shadows stay soft and dark in both modes; on black panels they barely show, which is fine because the panels already stand off the navy page.

Every dark text token passes 4.5:1 on the dark page, on black, on `--soft` and on its own tint. Each measures at least 6:1 there; the lowest is `--ink-muted` on `--soft`. The rail (`--deep`, `--rail-text`) and the stage colors keep their light values in dark mode (concern 13).

**Stage colors** (concern 1): Cerulean tints for the open stages, each passing 4.5:1 with Midnight text: New Lead `#D0E8F0`, Qualified `#B1D8E5`, Showing `#93C9DB`, Offer `#76BBD2`, Under Contract `#58ADC9`. Closed (Won) is `#06D6A0` Sea Green and Lost is `#CDD8DB` Sea Mist, both with Midnight text.

**Type:**
- Instrument Sans for everything: page titles 30px semibold, with a small uppercase line above them (the date, or a count such as "18 open deals"); section titles 16px semibold; body 14px; table text 14px.
- JetBrains Mono for money, counts, percentages and dates in tables and tiles, with tabular figures so the columns line up. Wording such as "None yet" stays in Instrument Sans.
- Instrument Serif isn't used on any screen yet. It stays available for a tagline or quote later.

**Surfaces:** panels and cards are white on the `#F0F4F5` page (black on `#04232E` in dark mode), with 16px rounded corners for panels and 12px for cards, no outline, and a very soft shadow to lift them. No one-sided borders, no rule across the top of the page. Gradients aren't used, except that charts may use one soft fill under the revenue line. Table rows are separated by spacing and a faint row hover, not lines.

**Layout:**
- **Navigation rail**: 84px wide, Midnight in both modes, down the left of every page. It has the Sea Green "A" logo at the top and the five sections as an icon with a short label underneath (Dashboard, Orgs, Contacts, Deals, Pipeline). Icons and labels are Sea Mist. The current section has a slightly lighter Midnight tile behind it, with its icon in Sea Green. Nothing sits at the bottom of the rail; the theme is in the user menu.
- **Top bar** (R1): 64px tall, across the top of every page to the right of the rail, on the page background with no panel, line or shadow under it, so it reads as part of the page. On the left, the search box (R58): 420px wide, a `--panel` field with 12px rounded corners and a soft shadow, a Lucide search icon in `--ink-muted`, and a Cerulean focus ring. On the right, the user menu button (R6a): a 36px circle with the person's initials in semibold, using the same tinted avatar colors as contacts, with a Cerulean focus ring.
- **Search results** (R60): a `--panel` popover the width of the box, 16px rounded corners and a soft shadow, at most 480px tall, then scrolling. Group headings are small uppercase `--ink-muted` text. Each row shows the record's icon (Lucide `Building2`, `User` and `Handshake`, as in the rail) in a tinted circle, the name in 14px with the match in semibold, and the details in muted text, with chips and money as elsewhere. The highlighted row uses `--selected` with `--on-selected` text.
- **User menu** (R6a): a `--panel` menu 240px wide, opened under the button and lined up with its right edge, 12px rounded corners and a soft shadow. The name is 14px semibold and the email 12px `--ink-muted`. "Theme" is a small uppercase heading over its three choices, each with an icon (Lucide `Sun`, `Moon` and `Monitor`) and a Sea Green tick on the chosen one. "Sign out" sits last, after a gap, with Lucide `LogOut`, in `--ink`, not Raspberry, since it loses nothing.
- **Sign-in screen** (R49): no rail and no top bar. A `--panel` card 400px wide, centred on the page, 16px rounded corners and a soft shadow. The Sea Green "A" logo sits at the top, then the title in 24px semibold, the fields full width, and a full-width Sea Green "Sign in" button with Midnight text. The help line under the button is 13px `--ink-muted`. Errors use `--raspberry-text`, and the local mode line `--cerulean-text`.
- **Pages**: a header with the title and the main action on the right ("New contact"), under the top bar.
- **Dashboard**: see `dashboard.md`.
- **Record pages**: details panel on the left (one third), timeline on the right (two thirds), with linked records under the details. The "Added by" and "Last changed by" lines sit at the bottom of the details panel in 13px `--ink-muted`, with the person's name in `--ink` (R57). In a timeline entry, the name follows the date, in the same muted text.
- **Pipeline**: see `pipeline.md`.

**Writing:** short plain labels ("New deal", "Log activity", "Mark done"). No exclamation marks. Empty states say what's missing and offer the action ("No activities yet. Log one to start the timeline."). Confirmations are brief ("Deal saved"). Buttons that repeat on a page, such as each column's "Add deal" or each follow-up's "Mark done", have a name for screen readers that says which one they are.
