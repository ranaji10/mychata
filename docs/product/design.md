# Design rules

The single written source for how MyChata looks. Colour and type values live in `src/styles.css`; this file says how to use them. Recovered on 2026-09-26 from Lovable's project memory, which no longer holds them.

## Audience

Users are mostly 45–68, on phones. Plain words, one task per screen, nothing hidden behind gestures.

## Rules

| Rule                          | Value                                                                       | Where it is set                                             |
| ----------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Language                      | Czech default, English second; every string through `t("česky", "English")` | `src/lib/i18n.tsx`                                          |
| Dates and money               | `DD.MM.YYYY`; `1 234 Kč`                                                    | `fmtDate`, `fmtKc` in `src/lib/data.ts`                     |
| Body text                     | At least 16px (root is 17px)                                                | `src/styles.css`                                            |
| Tap targets                   | At least 44 × 44 px                                                         | buttons, `size-11` icons                                    |
| Contrast                      | Text at least 4.5:1 against its background                                  | check with DevTools                                         |
| Colour scheme                 | Light only. No dark mode. No purple or indigo gradients                     | `src/styles.css`                                            |
| Family look ("Airbnb warmth") | Coral `#FF5A5F` primary, cream `#FBF6F0` background, white rounded cards    | `:root` in `src/styles.css`                                 |
| Institution look              | Teal `#087F8C` primary, pale teal `#E8F5F6`                                 | `.institutional-theme` in `src/styles.css`                  |
| Font                          | Manrope (Google Fonts), system sans-serif fallback                          | `src/styles.css`, `src/routes/__root.tsx`                   |
| Layout                        | Mobile-first single column, sticky bottom tab bar                           | `src/components/AppShell.tsx`                               |
| Width                         | App shell `max-w-[420px]`                                                   | 4 public pages still use 400px; unify to 420px when touched |

## Changing a rule

Change it here and in the file named in the table, in the same pull request. Never in an agent's memory.
