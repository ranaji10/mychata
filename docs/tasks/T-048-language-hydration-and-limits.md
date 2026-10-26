# T-048 English without a hydration error, AI limits in one file

Owner: Claude (cloud session) · Status: review

Goal: fix F-29 found in the 26 Oct evening site check, and finish what T-015 left (one limits file).
Non-goals: no migration, no change to what the limits are, no server-side language detection.
Files allowed: `src/lib/i18n.tsx`, `src/lib/limits.ts` (new), `src/lib/task-translation.functions.ts`, `src/lib/manual-qa.functions.ts`, `src/lib/t015.test.ts`, `src/lib/t048.test.ts` (new), docs.
Invariants touched (AGENTS.md): 5.

## What was found and done

| Input                                                              | Finding                                                                                                                                                                                                                                                                               | Done                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F-29, site check `docs/external/claude/2026-10-26-site-check-2.md` | With English chosen, every server-rendered page logged React error #418: `LanguageProvider` read `mychata.lang` from localStorage in its first render, so hydration rendered English over the server's Czech HTML, and React threw the server HTML away and rendered the page again   | The language comes from `useSyncExternalStore` with `SERVER_LANG` ("cs") as the server/hydration snapshot; the stored choice applies straight after hydration. Another tab's switch is followed (`storage` event). Where localStorage throws, the choice is kept in memory for the page |
| T-015 rule 3                                                       | The AI daily limits were inline in two server-function files                                                                                                                                                                                                                          | `src/lib/limits.ts` (`AI_DAILY_LIMITS`: 200 translations, 30 questions, 40 document reads per user a day); both files use it; `t015.test.ts` pins the numbers and that no inline copy is left                                                                                           |
| T-014, T-015, T-016                                                | T-014's five items are all in the code (T-026: claim once per load, one signing request, AI time limits; `staleTime` 60 s in `router.tsx`; AskBox shows the failure and gives the question back). T-016 was done in T-044 (`supabase/tests/t016.test.ts`). T-015's last item is above | Briefs marked done                                                                                                                                                                                                                                                                      |

## Acceptance

- `bun run check` passes; `src/lib/t048.test.ts` fails on the old `i18n.tsx` (it rendered "Opening your cottage" for hydration with English stored).
- Local production build (`bun run build`, served with wrangler): Playwright with `mychata.lang = en` on `/auth`, `/` and an unknown path: no #418 (old code: one per load); `/auth` ends in English, `<html lang="en">`, English title; CZ switches back.

## Not verified

- On mychata.cz (after publish: the same Playwright check from the site check).
- An English user sees Czech for one frame before the switch; it was there before as well (the client re-render), now without the error. A cookie read by the server would remove it; not done.
