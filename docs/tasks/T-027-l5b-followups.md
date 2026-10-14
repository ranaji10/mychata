# T-027 L-5b follow-ups

Owner: Claude Code · Status: done

Goal: fix the visual bugs found in the PR #25 review, file Lovable's reports properly, and write the L-5c brief.
Non-goals: Czech link previews (L-5c), season photo recheck, signed-in release checks.
Files allowed:

- docs/external/claude/2026-10-14-PR25 check.md → docs/external/claude/2026-10-14-pr25-review.md (rename + header)
- src/components/ConfirmDialog.tsx
- src/routes/ukoly.$id.tsx
- src/components/ui/button.tsx
- src/components/TaskGroup.tsx
- src/routes/vice.tsx
- src/lib/consent.tsx
- src/components/AppShell.tsx
- src/styles.css
- src/lib/season.test.ts
- docs/fresh-air-review-checks.md → docs/external/lovable/2026-10-14-l5a-foundation-review.md
- docs/fresh-air-pages-review.md → docs/external/lovable/2026-10-14-l5b-pages-review.md
- docs/external/lovable/ (new files only)
- docs/external/claude/README.md
- AGENTS.md
- docs/STATUS.md
- docs/tasks/T-027-l5b-followups.md
- docs/tasks/T-028-l5c-public-pages.md
- roadmap.md

Invariants touched (AGENTS.md): none.

Context:

- docs/external/claude/2026-10-14-pr25-review.md (findings 1–5)
- docs/external/claude/2026-10-14-site-check.md
- docs/external/README.md (header format)
- prompts/2026-10-14/16-L-5c-public-pages-and-blue-check.md

Acceptance:

- `bun run check` passes
- `bun run build` succeeds
- Destructive AlertDialogActions use btn-danger-soft hover/active, never primary green
- TaskGroup tick visually 24px open / 26px done, per `docs/product/design.md` (the 28px in the PR #25 review was wrong); vice.tsx button-row icons 22px
- Consent banner at bottom-0 on pages without the tab bar, bottom-[84px] inside AppShell below lg

Handoff note:

- PR #25 review file renamed to `2026-10-14-pr25-review.md` with standard header, pr: 25, last_commit: 72ab3ea.
- Delete button active/hover green color fixed: `btn-danger-soft` in `styles.css` now explicitly sets `&:hover, &:active { background: var(--destructive-soft) }`; `ukoly.$id.tsx` updated to use `btn-danger-soft`.
- Icon sizes: `[&_svg]:size-4` moved from base CVA into `default`, `sm`, `lg` size variants so `fresh` and `icon` variants allow their children SVGs to specify their own sizes. `TaskGroup.tsx` tick button gets `size="icon"`.
- Consent banner: `data-consent-banner` on the container defaults to `bottom-0`; AppShell toggles `.has-tabbar` on `document.documentElement`, pushing the banner to `bottom: 84px` via `@media (max-width: 1023px)`.
- Lovable review documents moved to `docs/external/lovable/` with standard headers. Links updated in `STATUS.md` and `roadmap.md`.
- Reports index updated in `docs/external/claude/README.md`; AGENTS.md rule added.
- `STATUS.md` updated with L-5a/L-5b merge status, T-027 fixes, open items.
- T-028 brief written in `docs/tasks/T-028-l5c-public-pages.md`.
- Verified: `bun run check` (0 lint errors, 13 warnings, 103 tests passing, format clean, docs clean), `bun run build` successful.
