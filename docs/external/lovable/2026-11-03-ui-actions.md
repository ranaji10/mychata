# Requested UI actions — 3 Nov 2026

Preview only. No migrations, SQL, policies, auth, server functions, package or generated-integration changes. Capacity and “Mark my share paid” deliberately omitted.

## Phone click checklist

Use the preview at 375px and only **Testovací chata (Lovable)**.

| Item | What to click                                                                                                                                                                                                                                           | Checked                                                                                                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | **Výdaje → an expense**. Check payer and person-by-person split; **Nahrát účtenku** uploads a photo and tapping the photo opens it. For an unsettled expense you paid, check **Připomenout** beside each debtor and **Uhradím vše → red confirmation**. | Expense sheet and receipt upload/read-back passed. Temporary receipt/expense removed. Two-person reminder and cover-all not exercised.                                           |
| 2    | **Nastavení → Odjezdové úkoly → Uložit předání**. Check the recipient/date confirmation or “Uloženo. Zatím žádný další pobyt.”                                                                                                                          | No-next-stay confirmation passed; new handover removed. Next-recipient delivery unverified.                                                                                      |
| 3    | **Nastavení → Údržba → overdue task → Přidat poznámku ke zpoždění**. Check focused note field; type a note, tap **@**, choose a current member, save; use pencil/delete on your note.                                                                   | Focus, active-member picker, mention chip, add/edit/read-back/delete passed. Synthetic notes removed. CZ/EN switch passed.                                                       |
| 4    | **Upozornění → an item**. It opens its subject and the tapped stored item calls `mark_notifications_read`; merely opening the list does not mark everything read.                                                                                       | Existing list/badge renders. Self-mentions do not produce a stored notification, so another member's mention/read-back needs maintainer verification. No new bell.               |
| 5    | **Kalendář → awaiting-approval stay → Napsat správci → edit message → Poslat**.                                                                                                                                                                         | Implemented through `message_admins`; no email address shown. Delivery not exercised: own test account has no second signed-in admin.                                            |
| 6    | **Nastavení → Spravovat chaty → Přidat chatu**. Only the name is asked. Save, check tile's **Chybí údaje**, then **Doplnit** for missing fields/photo link and exact “Proč se ptáme” hints. Check matching onboarding fields.                           | Name-only creation/read-back and badge passed. Capacity omitted; onboarding initial screen checked, complete family/institution onboarding not submitted.                        |
| 7    | **Spravovat chaty → Pravidla domu → Přidat → Použít základní pravidla**. Edit/delete/add lines; Cancel saves nothing, Save persists. Also on onboarding's house-rules step.                                                                             | Ten exact draft rules, edit, Save and read-back through Manual passed. Unmodified starter lines retain their exact bilingual equivalents; custom text is not machine-translated. |
| 8    | **Manuál → an unanswered question → a suggestion or Jiné…**. Edit bilingual fields, check **Jen členové**, save. Pencil edits a saved section.                                                                                                          | Exact suggestion prefill, editable form, members-only default and save/read-back passed. Saved temporary sections removed.                                                       |

## Verification

- 375 × 812 and 1280 × 1800: Expenses, Tasks, Manage cottages, Manual, Add cottage, Notifications and onboarding first screen have no horizontal overflow; no runtime errors captured.
- Focused tests: 18/18 passed (`ui-action-rules.test.ts`, `data.test.ts`). Lint: zero errors, 14 existing warnings. Generated-docs check passed. Preview's latest automatic build/typecheck: OK.
- Full `bun run check` was not run because this workspace prohibits manually running builds/typechecks; CI remains the release gate. Nothing published.
- Existing leaf routes keep their app-specific Czech titles and complete description/Open Graph/Twitter metadata. No new route or social image.

## Remaining gaps and test cleanup

- The temporary **Lovable dočasná chata (test)** could not be deleted by the existing member-facing table permissions (zero rows). Its manual sections were removed; it has no photos, tasks or expenses. Original test cottage restored. A maintainer must remove the empty temporary cottage separately.
- Reminder RPC reminds the person's total outstanding debt to the payer at that cottage, not only this expense; repeats that day are accepted but deduplicated by the existing function.
- Existing `message_admins` excludes the sender; with no other signed-in admin it returns `no_admin`. Its notification opens Notifications, not the stay, because the existing payload has no booking id; dates/name are included in the draft message.
- Note edits change body only; original mention chips are retained. Changing mentions on a saved note would need a separate supported write path, so it is omitted.
- Saved starter rules, user text and suggestions are not translated automatically. Exact approved defaults are bilingual; a custom rule keeps its entered wording in the other language until edited in Manual.
- Stored notification read persistence, two-person actions, pending-stay delivery, next-recipient delivery and complete institutional onboarding remain maintainer checks. Exhaustive contrast and mobile keyboard behavior not audited.

## Every changed file

- `AGENTS.md` — shared UI/content boundary.
- `roadmap.md` — scoped work and remaining checks.
- `docs/STATUS.md` — preview behavior and gaps.
- `docs/external/lovable/2026-11-03-ui-actions.md` — this checklist.
- `src/lib/cottage-content.ts` — exact approved content.
- `src/lib/ui-action-rules.ts` — pure UI action limits.
- `src/lib/ui-action-rules.test.ts` — concrete action-rule tests.
- `src/lib/notifications.ts` — no bulk stored-read side effect from local seen state.
- `src/components/CottageFieldHint.tsx` — shared approved hints.
- `src/components/HouseRulesEditor.tsx` — editable starter list.
- `src/components/ManualSuggestions.tsx` — question and answer choices.
- `src/components/TaskNotes.tsx` — notes/mentions/author controls.
- `src/components/ExpenseDetail.tsx` — expense sheet and actions.
- `src/components/CottageSetup.tsx` — missing-field hints.
- `src/components/TaskGroup.tsx` — overdue-note link.
- `src/routes/vydaje.tsx` — tappable expense rows.
- `src/routes/predani.tsx` — next-recipient confirmation.
- `src/routes/ukoly.$id.tsx` — note focus and list.
- `src/routes/upozorneni.tsx` — read on tap.
- `src/routes/rezervace.$id.tsx` — message admin.
- `src/routes/chata.nova.tsx` — name-only form.
- `src/routes/chaty.tsx` — badge/starter editor/bilingual defaults.
- `src/routes/onboarding.tsx` — matching hints and starter editor.
- `src/routes/manual.tsx` — suggestions and editable sections.

Screenshots stay in `/tmp/browser/ui-actions/`, not in the repository.
