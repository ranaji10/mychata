# B-006 Handover can only be saved when every item is ticked

Reported: 2026-09-26 by walkthrough of mychata.cz · Status: fixed on branch `agent/claude/T-017-review-bugs` (not yet live)
Where: mychata.cz/predani, any device, family account, member or admin
Screenshot: none
Steps to reproduce: open Předání, tick 3 of 5 items, try to save.
Expected / actual: expected to save with a record of what was skipped (a real handover often skips an item, e.g. no gas at this chata). Actual: button disabled, label "Zbývá 2 bodů".
Test that reproduces it: `src/lib/data.test.ts` → "handover checklist (B-006)". The disabled button itself is UI-only (no component test harness yet, T-015); manual check below.

Fix:

- Save is allowed with any number of items ticked, including none. A line above the button says how many will be saved as skipped; the button reads "Uložit předání (3 z 5 hotovo)".
- `checklist_state` stores every item as `{ state: "checked" }` or `{ state: "skipped" }` (`buildChecklistState` in `src/lib/data.ts`). Older handovers used `"na"`; it is read as skipped. No schema change: the column is already `jsonb`.
- History shows "x z y hotovo" (green when all done, amber otherwise) instead of a blanket "Dokončeno".
- The save error toast now includes the real error message.

Manual check (after deploy): tick 3 of 5 → button enabled, shows "3 z 5 hotovo" → save → history card shows amber "3 z 5 hotovo".
