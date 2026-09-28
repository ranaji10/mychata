# B-009 An expense nobody shares is shown as "Settled"

Reported: 2026-09-26 by walkthrough of mychata.cz · Status: fixed on branch `agent/claude/T-017-review-bugs` (not yet live)
Where: mychata.cz/vydaje, family account, any member
Screenshot: none
Steps to reproduce: add an expense and select only yourself in "Rozdělit mezi".
Expected / actual: expected "Zaplaceno vámi, nerozděleno". Actual: "Vyrovnané" / "Settled", because the page showed Settled for every expense without an unpaid split, including one with no splits at all.
Test that reproduces it: `src/lib/data.test.ts` → "expense settlement (B-009)".

Fix:

- `expenseSettlement()` in `src/lib/data.ts`: no splits → `not_split`; all splits paid back → `settled`; otherwise `unsettled`.
- `src/routes/vydaje.tsx`: `not_split` shows "Zaplaceno vámi, nerozděleno" / "Paid by you, not split" when you paid, and "Nerozděleno" / "Not split" when someone else did (their name is already on the row; "Paid by you" would be wrong for them). No pill is shown until the splits have loaded, so nothing flashes "Settled".
- Saving such an expense no longer sends an empty split insert, and the toast says "Výdaj přidán, nerozdělen."
