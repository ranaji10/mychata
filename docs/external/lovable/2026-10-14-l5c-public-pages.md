---
source: lovable
date: 2026-10-14
status: draft
task: T-028
---

# L-5c public pages: preview delivery and verification

## Delivery and scope

This is a partial verification, not a release approval. No publish, manual push, package change, migration, SQL, policy or server-function edit was performed. Shared UI, AppShell, calendar, bits, consent and global CSS were not changed.

Changed: the nine named public/content route files, the two root fallback components, `src/lib/error-page.ts`, the task checklist in `roadmap.md` (allowed by T-028), and this report. Existing redirects, queries, validation and submission handlers remain. Onboarding exposes the existing account-type state through a selector so the requested immediate green/blue switch is available. Landing retains its existing loading copy and redirect, with the requested two pill actions.

All nine content routes have Czech title, description, og:title and og:description. Existing noindex tags were preserved. Landing and auth stock photos use `useDefaultChataPhoto()`, explicit dimensions and high fetch priority without lazy loading. The institutional request photo also uses the stock hook. No bundled-relative image was added to social metadata.

## Branch and commits

Editor branch: `edit/edt-6a7ffcac-f9f3-49f2-8229-a35baa7da032`, not `lovable-sync`. Platform-managed commits; no manual Git writes.

- `f69f7bd` — public-page presentation, Czech metadata, hero priority, state presentation, static fallback and roadmap.
- `72eef9b` — language-provider wrappers for the root error and not-found components, whose language controls otherwise had no provider.

These are the commit IDs visible at report preparation. Platform-generated final report/formatting commits may follow. Earlier intermediate IDs were consolidated by the platform; use current history when preparing a PR.

## Browser checks

Local preview, Chromium, widths 375, 768 and 1280px, height 900px. The restored session was checked on Home before visiting Settings: the active cottage was **Testovací chata (Lovable)**. Only its calendar link copied through its own Settings button was opened; tokens are omitted here.

- Auth main choice, institution registration, email registration and email sign-in were opened at all widths.
- Reset, test-cottage public calendar and not-found page were opened at all widths: no horizontal overflow; page-error list empty.
- All five onboarding steps were reached at each width without completing/saving onboarding. Green/blue selector changes were immediate. The mobile selector stacks to prevent its longest label overflowing.
- Root loading/landing was captured before its existing redirect. It is not a persistent marketing page; changing that redirect was outside this presentation task.
- 404 English switch verified after hydration: `Page not found`.
- Static fallback HTML rendered independently at 375px: no overflow. This does not exercise a live server failure.
- Auth and calendar Czech document titles were read back from the browser.

Representative command output:

```text
Test cottage confirmed
Copied calendar link from test cottage; token omitted
Onboarding blue 375 institution
All five onboarding steps reached without saving 375
Onboarding blue 768 institution
All five onboarding steps reached without saving 768
Onboarding blue 1280 institution
All five onboarding steps reached without saving 1280
auth/reset/calendar/error 375: overflow False
auth/reset/calendar/error 768: overflow False
auth/reset/calendar/error 1280: overflow False
Page errors: []
404 English switch: Page not found
Fallback overflow False
```

## Contrast and shared blockers

Measured rendered CSS tokens in Chromium using canvas conversion to RGB and WCAG relative luminance, not a DevTools audit panel. Auth and calendar measurements produced the same palette values. Blue calendar was a token-only preview, **not** a genuine institution account/property check.

| Pair                                  |    Green |     Blue |
| ------------------------------------- | -------: | -------: |
| Foreground / page                     |    15.69 |    16.14 |
| Muted foreground / gradient top       |     5.73 |     5.88 |
| Muted foreground / page               |     6.35 |     6.60 |
| Enabled primary button text / primary |     5.32 |     6.48 |
| Subtle / white calendar card          |     4.52 |     4.56 |
| Faint / white calendar card           | **2.25** | **2.28** |

The shared calendar's other-month dates use `--faint` and fail the requested 4.5:1. Tokens and shared calendar are prohibited here; no shared change was made. Exhaustive element-level contrast across all states, including disabled buttons and image overlays, is not certified.

The banner was flush to the bottom at 375px (`bottom gap 0`). Before dismissal it intercepted the lower institution-registration action; accepting only necessary cookies allowed the flow. Existing desktop `lg:bottom-4` places it 16px above the bottom by source inspection. These are shared consent/design blockers, left unchanged as instructed. Banner positioning was not independently checked on invitation and other public-token pages.

## Brand review

- Auth main is green; institution form blue: browser checked.
- Onboarding Family green / Institution blue: browser checked at all widths.
- Test-cottage public calendar green: browser checked.
- Public calendar/manual select brand from already-loaded `is_institution`; institutional request is always blue: source inspection only for institution data.
- Guest and invitation data currently provide no institution indicator; per design section 1 these remain green without adding fields.
- Signed-in AppShell uses its account brand and SSR class: source inspection only. No institutional account was available to verify reload flash, blue-account sign-out or populated approvals/requests/export. No changes were made to those screens.

## Commands and output

```text
bun run lint
✖ 13 problems (0 errors, 13 warnings)

bun run format:check
$ prettier --check .
Checking formatting...
All matched files use Prettier code style!

bun run test
Test Files 10 passed (10)
Tests 103 passed (103)
Duration 5.32s

bun run docs:check
$ bun scripts/gen-docs.ts --check
(exit 0)

rg -n 'chata.jpg|asset.json|__l5e' src
(no matches)

rg -n '#[0-9a-fA-F]{3,8}\b' src/routes src/components --glob '*.tsx' --glob '!**/ui/**'
(no matches)

Preview build log, 2026-10-14T16:14:57Z
build OK
```

Manual `bun run check` and `bun run build` were not run: this workspace prohibits manual builds/typechecks; CI must run the full gate. Final report formatting is checked separately after creation.

## Not verified / follow-up

Not all requested states are verified. Valid, invalid, loading, network-error and submitted-success states for guest/invitation/manual/institutional request remain untested in the browser. No guest or invitation link was created just for screenshots, and no arbitrary/other-cottage token was opened. Public manual contents, root runtime-error recovery, reset submission, signup error/success, Google OAuth and onboarding save were not exercised. These omissions prevent claiming every page/state is complete.

Institutional test account and approved test-cottage links are required for remaining institution/guest/invitation checks. Shared calendar contrast and consent-banner overlap/desktop offset require a separately authorized shared change.

No records were created, and no new test records remain. Copying the test calendar link called the existing enable-public-calendar action; its link remains enabled. Existing seeded data was not deleted or changed.

## Screenshots

Screenshots are not committed. Chat attachments show representative frames; local evidence remains in `/tmp/browser/l5c/`:

- `landing-375.png`: existing landing/loading screen before redirect.
- `onboarding-green-375.png`, `onboarding-blue-375.png`: actual selector states.
- `calendar-375.png`: real test-cottage calendar.
- `error-375.png`: 404.
- `fallback-375.png`: isolated plain-HTML fallback.
- `auth-1280.png`, `auth-signin-375.png`, and width variants: auth and form views.

Metadata changes reach the live URL only after a future publish; this task did not publish.


> Combined by Claude on 14 Oct 2026: Lovable made this follow-up on a branch based on `main` (lovable-sync-1792000663), without the L-5c edits. It was merged onto PR #28's branch. Lovable's checkout had no onboarding selector, so Claude removed it in the combined branch (see section 1).

## Follow-up: three requested changes (17:33 UTC, 14 Oct 2026)

Branch in this workspace: `edit/edt-6216b886-235d-4ec3-8390-614763a739fd` (PR #28 content). The
original L-5c report file was not present in this checkout; the earlier L-5c edits exist only on
the backup branch (`origin/lovable-backup-main-1791996871`). Only the three requested changes were
made here; everything else was left as found.

### 1. Onboarding: account-type buttons removed

Lovable's follow-up checkout was based on `main`, which never had the selector, so Lovable changed nothing here. Claude removed the "Rodina" / "Instituce / Organizace" button group from step 0 of `src/routes/onboarding.tsx` in the combined branch. The type again comes only from sign-up metadata (`signup_kind "institution"` → INSTITUTIONAL, else FAMILY). The `setType` calls in the sign-up effect are unchanged. This supersedes the sentence above saying that onboarding exposes the account type through a selector.

### 2. Sign-in page: institution sign-up as a third full-width button

`src/routes/auth.tsx`, main view:

- Removed the small text link "Škola nebo firma? Registrovat instituci" at the bottom.
- Added a third full-width button directly under "Registrovat se e-mailem", same shape as the
  other two (`variant="fresh" size="fresh"`, `min-h-[56px] w-full text-[17px]`), with the
  `Building2` icon from lucide-react.
- Label: `t("Registrovat instituci", "Sign up as an institution")` — the "(škola, firma, spolek)"
  parenthetical was removed on request; still calls `open("institute", true)`.
- Style: `btn-secondary` plus the existing blue token `var(--cat-tasks)` on the `Building2` icon
  (no new CSS, `styles.css` untouched). Note: `btn-secondary` draws its ring with an inset
  box-shadow, so a `border-[var(--cat-tasks)]` class has no visible effect — the blue accent shows
  in the icon only.
- "Už máte účet? Přihlásit se" now sits below all three buttons, unchanged in wording.

Verified in the preview at 375×812, 768×1024 and 1280×900: the three buttons are all visible
without scrolling (at 375px the institution button's bottom edge is at 752px of the 812px
viewport), tap targets are 56px tall, Czech text first, and the old small link is gone.
Screenshots: `/tmp/browser/l5c/screenshots/auth_375_clean.png`, `auth_768.png`, `auth_1280.png`.

### 3. roadmap.md

This checkout had no "T-028 Fresh air public pages" section, so it was added at the top with the
item "Check contrast, brands, cookie position and write the scoped report" unticked and marked
"(partial: see report)".

### Not verified

- No sign-up flow was exercised (no new accounts created); the button's behaviour is the same
  `open("institute", true)` call the old link used.
- `bun run check` was not run (manual builds/typechecks are restricted in this workspace); the
  preview build after the edits reports "build OK" in /tmp/observability/build-errors.log.
- No test records were created.
