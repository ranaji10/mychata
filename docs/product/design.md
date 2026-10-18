# Design rules

The single written source for how MyChata looks. Colour and type values live in `src/styles.css`; this file says how to use them. Rewritten on 14 Oct 2026 for the **"Fresh air"** direction (Option A of the 13 Oct visual directions). It replaces the earlier coral "Airbnb warmth" look.

## Audience

Users are mostly 45–68, mostly on phones, some on tablets and computers. Plain words, one task per screen, nothing hidden behind gestures.

## Fixed rules (unchanged)

| Rule            | Value                                                                                                                                                                        | Where it is set                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Language        | Czech default, English second; every string through `t("česky", "English")`                                                                                                  | `src/lib/i18n.tsx`                                   |
| Dates and money | `DD.MM.YYYY`; `1 234 Kč`                                                                                                                                                     | `fmtDate`, `fmtKc` in `src/lib/data.ts`              |
| Body text       | At least 16px (root stays 17px). Only tab-bar labels, legends and pills may be 12–13px                                                                                       | `src/styles.css`                                     |
| Tap targets     | At least 44 × 44 px                                                                                                                                                          | buttons, `size-11` icons                             |
| Contrast        | Text at least 4.5:1 against its background                                                                                                                                   | check with DevTools                                  |
| Colour scheme   | Light only. No dark mode. No purple or indigo gradients                                                                                                                      | `src/styles.css`                                     |
| Layout          | Mobile-first. Phone: one column, sticky bottom tab bar. Tablet (`md`, 768px+): same column, 720px wide. Desktop (`lg`, 1024px+): tabs in a left sidebar, content up to 820px | `src/components/AppShell.tsx`                        |
| Width           | App shell 420px on phones, 720px from `md`, sidebar + 820px from `lg`. Public pages 640–720px from `md`; sign-in and onboarding forms stay narrow (480–560px)                | each route's `<main>`; `src/components/AppShell.tsx` |

## 1. Two brands, one design

There is one design. It comes in two colour schemes and **nothing else differs**: same layout, type, spacing, radii, components, copy and icons.

| Brand                     | Who sees it                                   | Primary   |
| ------------------------- | --------------------------------------------- | --------- |
| `family` (default, green) | Everyone, unless the institution rule applies | `#1F7A4D` |
| `institution` (blue)      | See the rule below                            | `#1D5FA6` |

**Institution rule.** A screen uses the blue `institution` brand when any of these is true:

1. A signed-in person whose **active account** has `type === "INSTITUTIONAL"` (every page inside `AppShell`, including dialogs, sheets, toasts and menus).
2. `/auth` while the institution sign-up form is open (`mode === "institute"`). The main sign-in choice screen stays green.
3. `/onboarding` while `type === "INSTITUTIONAL"` is selected.
4. Public token pages whose property belongs to an institution: `/verejne/zadost/$token` (always an institution), and `/verejne/kalendar/$token`, `/verejne/manual/$token` when `public_property` returns `is_institution = true`.
5. `/host/$token` and `/pozvanka/$token` only if the data they already load says the account is an institution. Do not add database fields for this; if the data isn't there, these stay green.

Everything else is `family` (green): the landing page `/`, the main `/auth` screen, `/reset-password`, `/soukromi`, error pages.

**How it is applied.** `src/lib/brand.ts` exports `useBrand(brand: "family" | "institution")`, which sets `document.documentElement.dataset.brand` and puts it back to `"family"` on unmount. Pages and `AppShell` call it. `AppShell`'s root element also gets the class `brand-institution` so the first server-rendered paint is already blue (no green flash). CSS matches both: `:root[data-brand="institution"], .brand-institution { … }`. Setting it on `<html>` is what makes portals (Radix dialogs, sheets, selects, Sonner toasts) follow the brand. The old `.institutional-theme` class and its teal values are removed.

## 2. Colour tokens

All colours are CSS variables in `src/styles.css`, exposed to Tailwind through `@theme inline` (as today). Components use tokens only: no hex values in routes or components.

### Brand-dependent tokens

| Token                                  | Family (green) | Institution (blue) | Used for                                                    |
| -------------------------------------- | -------------- | ------------------ | ----------------------------------------------------------- |
| `--background`                         | `#F5F8F5`      | `#F5F7FA`          | Page background                                             |
| `--background-top`                     | `#E2EFE5`      | `#E2EBF5`          | Top of the page gradient (new token)                        |
| `--foreground`                         | `#14201A`      | `#141B24`          | Main text, dark pill buttons, selected segment              |
| `--primary`                            | `#1F7A4D`      | `#1D5FA6`          | Primary buttons, links, active tab, confirmed stays, ticks  |
| `--primary-hover`                      | `#155C39`      | `#164A82`          | Hover/pressed primary and link hover (new token)            |
| `--primary-foreground`                 | `#FFFFFF`      | `#FFFFFF`          | Text on primary                                             |
| `--primary-soft`                       | `#E7F3EA`      | `#E6EEF8`          | Tinted chips, date badges, active tab icon fill, ok pill bg |
| `--primary-muted`                      | `#D5E6DA`      | `#D4E1F0`          | Inactive bars in mini charts (new token)                    |
| `--secondary` / `--muted` / `--accent` | `#F0F4F1`      | `#EEF2F7`          | Round icon buttons, quiet surfaces                          |
| `--secondary-foreground`               | `#14201A`      | `#141B24`          |                                                             |
| `--muted-foreground`                   | `#4E5F55`      | `#4B5A69`          | Secondary text, captions, labels                            |
| `--nav-foreground`                     | `#5B6B62`      | `#5A6877`          | Inactive tab-bar items (new token)                          |
| `--sidebar-foreground`                 | `#3F4F46`      | `#3E4B59`          | Inactive desktop sidebar items (new token)                  |
| `--subtle`                             | `#6B7A71`      | `#6B7785`          | Done/struck-through tasks, past days (new token)            |
| `--faint`                              | `#A3B0A8`      | `#A3ADB8`          | Days outside the month (new token)                          |
| `--control-border`                     | `#8A9890`      | `#8896A5`          | Empty checkbox circle (new token)                           |
| `--border`                             | `#E6ECE7`      | `#E4E9EF`          | Tab bar top border, outlines                                |
| `--divider`                            | `#EEF2EF`      | `#EDF1F5`          | Row dividers inside cards (new token)                       |
| `--input`                              | `#D3DDD6`      | `#D2DAE3`          | Field borders, secondary-button outline                     |
| `--track`                              | `#E3ECE5`      | `#E1E8F0`          | Progress-bar track (new token)                              |
| `--ring`                               | = primary      | = primary          | Focus outline                                               |
| `--shadow-rgb`                         | `20 32 26`     | `20 27 36`         | Shadow colour, used as `rgb(var(--shadow-rgb) / a)` (new)   |

### Shared tokens (identical in both brands)

| Token                 | Value     | Used for                                       |
| --------------------- | --------- | ---------------------------------------------- |
| `--card`, `--popover` | `#FFFFFF` | Cards, sheets, dialogs                         |
| `--warn`              | `#E39A2D` | Progress fill for money owed, warn dots        |
| `--warn-soft`         | `#FDF0DD` | Pending stays, pending badge background        |
| `--warn-foreground`   | `#8A4F00` | Text on `--warn-soft`                          |
| `--warn-border`       | `#C77700` | Pending legend swatch outline                  |
| `--destructive`       | `#B3261E` | Overdue text, delete actions, errors           |
| `--destructive-soft`  | `#FCECEA` | Danger button and danger pill background (new) |
| `--alert-dot`         | `#D9483B` | Small unread/attention dot                     |
| `--ok`                | `#1F7A4D` | Success text (stays green in both brands)      |
| `--ok-soft`           | `#E7F3EA` | Success background                             |
| `--cat-tasks`         | `#2563A6` | Task icon in quick actions (new)               |
| `--cat-expenses`      | `#9A5B00` | Expense icon in quick actions (new)            |

`BRANCH_COLORS` in `src/lib/data.ts` becomes `["#1F7A4D", "#2E6FB0", "#0F766E", "#B45309", "#7C5CBF"]` (coral removed). `public/manifest.webmanifest`: `theme_color` `#1F7A4D`, `background_color` `#F5F8F5`.

### Page background

Home, sign-in, onboarding, landing and public pages: `background: linear-gradient(180deg, var(--background-top) 0px, var(--background) 280px) no-repeat, var(--background);`
All other inner pages (Calendar, Tasks, Expenses, Settings…): flat `var(--background)`.

## 3. Type

| Role                    | Size / line-height                                                                                                                                                | Weight                   | Notes                                     |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ----------------------------------------- |
| Font                    | **Plus Jakarta Sans** 400–800 (Google Fonts), `system-ui, sans-serif` fallback. Replaces Manrope in `src/styles.css` and the font link in `src/routes/__root.tsx` |                          |                                           |
| Hero headline (phone)   | 31–32px / 1.12                                                                                                                                                    | 800                      | letter-spacing −0.02em; sign-in and Home  |
| Hero headline (desktop) | 40px / 1.1                                                                                                                                                        | 800                      | letter-spacing −0.02em                    |
| Page title              | 28px / 1.15                                                                                                                                                       | 800                      | letter-spacing −0.02em (Calendar, Tasks…) |
| Section heading         | 18px (19px desktop)                                                                                                                                               | 700                      |                                           |
| Card value / big number | 20px (24px desktop)                                                                                                                                               | 800                      |                                           |
| Brand wordmark          | 18px (19px desktop)                                                                                                                                               | 800                      | "My Chata"                                |
| Body / list title       | 16px / 1.5                                                                                                                                                        | 600 titles, 400–500 body |                                           |
| Secondary / caption     | 14–15px                                                                                                                                                           | 500–600                  | `--muted-foreground`                      |
| Card label              | 14px                                                                                                                                                              | 600                      | `--muted-foreground`                      |
| Tab label, pill, legend | 12–13px                                                                                                                                                           | 600–700                  |                                           |

## 4. Shape, spacing, depth

- `--radius: 0.75rem` (12px at the 16px base the scale is based on). Use these px values:
  - Cards, stat tiles, list cards: **22px** on phone, **24px** from `lg`.
  - Stay rows: 20px. Calendar card: 24px.
  - Photos: **28px** large (sign-in hero, Home hero), 18px small (inside a card).
  - Date badges and logo mark: 14px (badge 44–48px square), logo 12px at 40px / 14px at 44px.
  - Checkbox (done): 8px. Mini-chart bars and legend swatches: 4px.
  - Buttons, chips, pills, segmented controls, avatars, round icon buttons: fully round (`9999px`).
- Page padding 20px on phone, 24px desktop. Gap between sections 18–24px; inside cards 6–12px; tile grid gap 12px phone, 16px desktop.
- Shadows (no coloured glows any more):
  - Card: `0 1px 2px rgb(var(--shadow-rgb) / 0.05)`
  - Chip / active sidebar item: `0 1px 2px rgb(var(--shadow-rgb) / 0.06)`
  - Floating round button / avatar: `0 2px 8px rgb(var(--shadow-rgb) / 0.08)`
  - Sheets and dialogs: keep `shadow-2xl`.

## 5. Components

Keep the existing utility names in `src/styles.css` so pages need few class changes; only their values change.

**Buttons**

- `btn-primary`: pill, `--primary` background, white 700 text, hover/active `--primary-hover`, no shadow. Heights: large 56px (17px text) for the main action on sign-in/onboarding/forms; default 52px (16px); compact 44px (15px) for page-header actions like "+ Pobyt". Icon 18–20px, gap 8–10px.
- `btn-secondary`: pill, white background, `inset 0 0 0 1.5px var(--input)`, `--foreground` text, 700.
- `btn-dark` (new): pill, `--foreground` background, white text, 700. For a decisive inline action such as "Schválit".
- `btn-danger-soft`: pill, `--destructive-soft` background, `--destructive` text.
- Disabled: 50% opacity, `not-allowed`, and a visible hint explaining why (as today).

**Round icon button**: 44px circle, `--secondary` background, 18px icon. Header variant: 48px circle, white, floating shadow.

**Logo mark**: rounded square (40px/12px radius phone, 44px/14px desktop), `--primary` background, white house outline icon (lucide `House`/`Home`, stroke 2). Replaces the "M" letter square everywhere. Wordmark "My Chata" next to it where there is room.

**Segmented control** (language CZ/EN): white pill container, 4px padding, 2px gap; options min 44 × 36px, 14px 700; selected = `--foreground` background, white text; unselected = `--muted-foreground` text.
**View toggle** (Měsíc / Seznam and similar filters): separate 40px pills, 14px; selected `--foreground` bg + white 700, unselected white + `--foreground` 600.

**Stat tile** (`StatCard` in `bits.tsx`): white, radius 22/24, padding 16 (20 desktop), gap 6. Row 1: label (14px 600 muted) left, 34px round icon chip right (tinted bg + 18px icon: stays `--primary-soft`/`--primary`, money `--warn-soft`/`--cat-expenses`). Row 2: value 20/24px 800. Row 3: caption 14px muted (overdue caption `--destructive` 600). Optional footer: a 7-bar mini chart (34px high, 4px gap, radius 4, active `--primary`, others `--primary-muted`) or an 8px pill progress bar (`--track` track; `--primary` or `--warn` fill) with a 13px caption. Only show a chart or bar when the data already exists on the page.
Phone: 2 columns. Desktop: `repeat(auto-fit, minmax(200px, 1fr))`.

**List card** (tasks, items): white, radius 22, padding 4px 16px; rows min 60px with `--divider` between. Title 16px 600, caption 14px muted. Trailing control: done = 26px square radius 8 `--primary` with white check (stroke 3); open = 24px circle, 2px `--control-border`. Done title: `--subtle` + line-through.

**Settings row** (`SettingsRow` in `bits.tsx`, T-040): the only way to draw a row in a divided settings list. Min 60px, square corners, 34px tinted icon bubble, 16px 700 label with an optional 14px muted hint, chevron right (or down for a row that opens a sub-list). A link and a button look identical. Never use a pill `<Button>` as a full-width list row: its rounded corners show as curved lines at the dividers (bug 6, guarded by `t040.test.ts`).

**Quick action chip**: 48px pill, white, chip shadow, 16px 600, 20px icon coloured by category (stay `--primary`, task `--cat-tasks`, expense `--cat-expenses`). Horizontal row; scrolls on overflow.

**Stay row**: white, radius 20, padding 14, gap 12. 44px date badge (radius 14, 800): confirmed `--primary-soft`/`--primary`, pending `--warn-soft`/`--warn-foreground`. Title 16px 700, caption 14px muted ("18.–21. 10. · 3 hosté"). Trailing status pill.

**Pills** (`PillOk`, `PillWarn`, `PillDanger`, `PillNeutral`): 13px 700, padding 6px 10px, fully round. Ok `--primary-soft`/`--primary`; Warn `--warn-soft`/`--warn-foreground`; Danger `--destructive-soft`/`--destructive`; Neutral `--secondary`/`--muted-foreground`.

**Fields** (`field`): 52px, radius 16, white, 1.5px `--input` border, 16px text; focus 2px `--ring` outline. Labels (`label-text`) 15px 700.

**Links**: `--primary`, 700, no underline in nav contexts, hover `--primary-hover`.

**Calendar month grid**: inside a white radius-24 card, padding 16. Month header: 44px round prev/next buttons (`--secondary`), month name 18px 800 centred. Weekday row 13px 700 `--nav-foreground`. Day cells 42px tall, 15px 600. Today: 42px circle with `inset 0 0 0 2px var(--foreground)`, 800. Past days `--subtle`; other-month days `--faint`. Confirmed stay = continuous `--primary` band, white 800 numbers, 14px radius on the first and last day. Pending = `--warn-soft` band, `--warn-foreground` numbers. Legend under the grid: 12px swatches (radius 4), 13px 600 muted text.

**Bottom tab bar (phone/tablet)**: 84px incl. safe-area padding, white, 1px `--border` top. Equal columns, item min 52px tall, 26px icon (stroke 1.7) over a 12px label. Inactive `--nav-foreground` 600; active `--primary` 700 with the icon filled `--primary-soft` (Home icon filled `--primary`). No pill highlight behind the active item.

**Desktop sidebar**: logo mark 44px + wordmark 19px 800, 20px below it. Items 48px tall, radius 16, 16px, 22px icon, gap 12. Active: white background, chip shadow, `--primary` 700. Inactive: `--sidebar-foreground` 600, hover `--secondary`. Inside Settings, its pages are listed under the Settings item (44px, 15px, left rule in `--divider`; active `--primary-soft`/`--primary` 700), and the open cottage's pages under Manage cottages (`src/lib/settings-nav.ts`).

**App header**: logo mark on phone (avatar on Home), cottage name 17px 700 + 18px chevron opening the switcher. No account line above the cottage name (T-040: an account named after an email read as the signed-in person); the switcher shows each account's name over its cottages, My profile shows the email. Notifications are a tab (bell icon, red count badge), not a header bell.

**Sheets and dialogs**: white, radius 28 (top corners only for phone bottom sheets), 20px padding, 44px round close button.

**Toasts (Sonner)**: white, radius 16, card shadow, 15px text; success icon `--ok`, error `--destructive`.

## 6. The default chata photo (seasonal)

Whenever a cottage has no main photo (`usePrimaryPhotoUrl` returns null), and on every screen that shows a stock cottage picture, show the picture for the **current season**:

| Season | Months (Prague time) | File                                   |
| ------ | -------------------- | -------------------------------------- |
| Spring | March – May          | `src/assets/seasons/chata-spring.webp` |
| Summer | June – August        | `src/assets/seasons/chata-summer.webp` |
| Autumn | September – November | `src/assets/seasons/chata-autumn.webp` |
| Winter | December – February  | `src/assets/seasons/chata-winter.webp` |

- Seasons are meteorological (whole months), decided by the date in `Europe/Prague`, so the picture changes automatically on 1 March, 1 June, 1 September and 1 December.
- The season is worked out from the current date each time a page renders (on the server and in the browser). No timer or polling: someone who opens or reloads a page on 1 December gets the winter picture.
- Code: `src/lib/season.ts` exports `seasonFor(date = new Date()): "spring" | "summer" | "autumn" | "winter"` (month from `Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Prague", month: "numeric" })`), and `useDefaultChataPhoto()` returning `{ src, alt }`. Alt text: "Chata na jaře" / "The chata in spring", "Chata v létě" / "…in summer", "Chata na podzim" / "…in autumn", "Chata v zimě" / "…in winter".
- Used in: `/` (landing), `/auth` (sign-in hero), `/verejne/zadost/$token`, and `/domu` as the fallback (`mainPhoto ?? defaultPhoto.src`). Any new place that needs a stock cottage picture uses the hook too. `src/assets/chata.jpg` is deleted once nothing imports it.
- The four images are ordinary files committed in the repo at the paths above and imported directly (`import spring from "@/assets/seasons/chata-spring.webp"`), so the build bundles them with hashed names and long caching, and they work on any hosting, local dev included. Do not use Lovable's asset storage (`*.asset.json` / `/__l5e/` URLs) for them.
- A cottage's own main photo always wins over the seasonal picture.
- Images are 1200 × 1200 WebP (≈ 240–380 KB). Show with `object-fit: cover; object-position: 50% 42%` so the house stays in frame in wide crops. Sign-in hero: full width, 250px tall, radius 28. Home hero: keep today's 16:10 (phone) / 21:9 (md+) crop, radius 28. Add `loading="lazy"` except on the sign-in hero.

## 7. Content patterns from the design

- Home headline: a one-line status built from data the page already has, e.g. "Chata je volná až do pátku." / "The chata is free until Friday." or "Dnes přijíždí Jana." / "Jana arrives today.". If there is no data to say something true, use "Dobrý den, {jméno}".
- Sign-in headline: "Společná chata, bez zmatků." / "One shared chata, no muddle." with the subline "Kalendář, úkoly, výdaje a návod k chatě na jednom místě." / "Calendar, tasks, expenses and the house manual in one place.". Institution sign-up keeps its own form copy.
- Don't invent features to match the mock-ups: where a mock-up shows something the app doesn't have (notification bell, occupancy chart), leave it out.

## Reference

Mock-ups (maintainers' folder, outside the repo): `design/2026-10-13-visual-directions/` boards `A-Signin`, `Main` (A · Home phone), `A-Calendar`, `A-Desktop`. Blue screens are the same boards with the institution tokens.

## Changing a rule

Change it here and in the file named in the table, in the same pull request. Never in an agent's memory.
