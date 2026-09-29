# T-018 Checklists and defaults (CC-2)

Owner: Claude Code · Status: review · Prompt: CC-2 in `docs/external/claude/2026-09-26-review-prompts.md`

Goal: the database changes the next Lovable screens (L-2, L-3) need. Migration 0024.
Non-goals: the screens themselves (grouped checklists, expense detail with "Cover it all") are Lovable's L-2 and L-3.
Invariants touched (AGENTS.md): 1 (two new SECURITY DEFINER functions with caller checks, one trigger function revoked from everyone), 2, 6.

| Change                         | How                                                                                                                                                                                                      |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seasonal checklist is one unit | `checklists` table, `tasks.checklist_id`, `add_checklist()` creates both; a second copy of the same template in the same year raises `checklist_exists` unless `_force` (the tasks page now asks inline) |
| Booking with only dates        | `requester_member_id` defaults to the current member, the name is filled in; a plain member's own booking is saved PENDING where the chata doesn't auto-confirm, and always in an institution            |
| "Cover it all"                 | `cover_expense(expense)`: payer or admin, marks every open split paid, writes `expense_covered` to the audit log                                                                                         |
| New task default               | `tasks.assignee_member_id` defaults to the creator; an explicit null stays unassigned                                                                                                                    |

Also fixed: `isoDateOrNull` refused every calendar date east of UTC, so dates tapped on the calendar never reached the booking form in Czech time.

Acceptance: `supabase/tests/security.test.ts` "checklists and defaults (T-018, migration 0024)"; full test run passed locally in Europe/Prague (86 tests). After Lovable applies 0024: add a seasonal checklist twice (second time asks), book with only dates.
