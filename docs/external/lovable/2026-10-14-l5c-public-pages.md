---
source: lovable
date: 2026-10-14
status: draft
task: T-028
---

# T-028 L-5c follow-up: three requested changes (17:33 UTC, 14 Oct 2026)

Branch in this workspace: `edit/edt-6216b886-235d-4ec3-8390-614763a739fd` (PR #28 content). The
original L-5c report file was not present in this checkout; the earlier L-5c edits exist only on
the backup branch (`origin/lovable-backup-main-1791996871`). Only the three requested changes were
made here; everything else was left as found.

## 1. Onboarding: account-type buttons removed

`src/routes/onboarding.tsx` already has no "Rodina" / "Instituce / Organizace" buttons in this
checkout — step 0 shows only the name (and organisation) fields, and the type comes only from
sign-up metadata (`signup_kind "institution"` → INSTITUTIONAL, else FAMILY), per the comment above
the `type` state. No change was needed; nothing else in onboarding was touched.

## 2. Sign-in page: institution sign-up as a third full-width button

`src/routes/auth.tsx`, main view:

- Removed the small text link "Škola nebo firma? Registrovat instituci" at the bottom.
- Added a third full-width button directly under "Registrovat se e-mailem", same shape as the
  other two (`variant="fresh" size="fresh"`, `min-h-[56px] w-full text-[17px]`), with the
  `Building2` icon from lucide-react.
- Label: `t("Registrovat instituci (škola, firma, spolek)", "Sign up as an institution (school, company, club)")`;
  still calls `open("institute", true)`.
- Style: `btn-secondary` with the existing blue token `var(--cat-tasks)` for the border and icon
  (no new CSS, `styles.css` untouched).
- "Už máte účet? Přihlásit se" now sits below all three buttons, unchanged in wording.

Verified in the preview at 375×812, 768×1024 and 1280×900: the three buttons are all visible
without scrolling (at 375px the institution button's bottom edge is at 752px of the 812px
viewport), tap targets are 56px tall, Czech text first, and the old small link is gone.
Screenshots: `/tmp/browser/l5c/screenshots/auth_375_clean.png`, `auth_768.png`, `auth_1280.png`.

## 3. roadmap.md

This checkout had no "T-028 Fresh air public pages" section, so it was added at the top with the
item "Check contrast, brands, cookie position and write the scoped report" unticked and marked
"(partial: see report)".

## Not verified

- No sign-up flow was exercised (no new accounts created); the button's behaviour is the same
  `open("institute", true)` call the old link used.
- `bun run check` was not run (manual builds/typechecks are restricted in this workspace); the
  preview build after the edits reports "build OK" in /tmp/observability/build-errors.log.
- No test records were created.
