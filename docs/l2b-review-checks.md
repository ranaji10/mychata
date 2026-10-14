# L-2b review fixes: phone-width checks

Use a dedicated test account and synthetic property, tasks, invitations and links only. Set browser width to 375px. This batch is preview-only; do not publish until PR #16 merges and release checks pass.

## Changed files and what to click

| File                                     | Check                                                                                                                                                                                                               |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/ManualCopyLink.tsx`      | Deny clipboard access, tap a copy/share action: adjacent read-only field receives focus and the entire link is selected. Tap or focus again to select all. The short bilingual status appears, not a raw-URL toast. |
| `src/routes/kalendar.tsx`                | Calendar → public calendar link; denied clipboard fallback appears beside this button.                                                                                                                              |
| `src/routes/clenove.tsx`                 | Settings → Members → copy a synthetic invitation; try another invitation and confirm the fallback follows the tapped invitation.                                                                                    |
| `src/routes/vice.tsx`                    | Settings → public calendar link, then guest link; fallback follows the correct action.                                                                                                                              |
| `src/routes/manual.tsx`                  | Manual → copy public manual link; fallback appears inside that card beside its action.                                                                                                                              |
| `src/routes/verejne.kalendar.$token.tsx` | Open a synthetic public calendar → Share; deny clipboard access and check adjacent fallback.                                                                                                                        |
| `src/components/TaskGroup.tsx`           | Tasks → Mine, Overdue or Seasonal: matching groups start open and show matching counts only. All preserves collapsed checklist groups.                                                                              |
| `src/routes/ukoly.tsx`                   | Filter synthetic tasks: empty groups disappear; no matches shows the filter-empty message. Simulate a failed task read: error plus Try again replaces the empty state; restore reads and retry.                     |
| `src/routes/rezervace.$id.tsx`           | Open a synthetic pending stay, switch test accounts, reopen: cache entries are account-specific. Failed/missing stay shows “We can't find this stay.”                                                               |
| `src/routes/host.$token.tsx`             | Open a synthetic guest link: read arrival/departure guidance, tap two calendar days; labeled dates look like plain text. Submission payload remains unchanged. Do not submit a real booking.                        |
| `AGENTS.md`                              | Housekeeping: the previously added reusable-components line has been removed.                                                                                                                                       |
| `roadmap.md`                             | Scroll restoration and pending-admin real-data verification remain unchecked. Synthetic L-2b checks are checked.                                                                                                    |
| `docs/STATUS.md`                         | L-2 UI batch has its own heading outside Open defects; L-2b results and limitations have their own heading.                                                                                                         |
| `docs/l2b-review-checks.md`              | This inventory and test checklist.                                                                                                                                                                                  |

## Verification

Synthetic browser fixture exercised the actual route components at 375px, replacing data sources with invented records and blocking external requests. All five clipboard locations, focus/selection, origin switching, task filters and empty state, task retry, missing stay, account cache separation and guest dates passed without page errors. Existing date/task/invitation tests: 28 passed. Automatic preview build passed.

Real checklist addition/scroll preservation and real pending-administrator names remain unverified. No migrations, SQL, RLS, auth, server functions, package versions, protected test directories or workflow files were changed. No publishing performed.
