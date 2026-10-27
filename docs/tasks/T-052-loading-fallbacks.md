# T-052 No blank or empty app after a failed or hanging read

Owner: Claude (cloud session) · Status: done

Goal: O-19 (left from the PR #80/#81 reviews): every signed-in screen either shows the app, "Zkusit znovu", or after 10 s a way out.
Non-goals: the queries themselves, Google sign-in on Brave (F-05), the start screen (T-051, done).
Files allowed: `src/lib/account.tsx`, `src/lib/load-error.ts` (new), `src/lib/sign-in-again.ts` (new), `src/components/AppShell.tsx`, `src/routes/index.tsx`, `src/lib/start-target.ts` (comment), `src/components/SetPasswordForm.tsx`, `src/routes/dokumenty.tsx`, `src/lib/t052.test.ts` (new), `docs/STATUS.md`, this brief.
Invariants touched (AGENTS.md): 5 (text through `t()`, 44px buttons), 6 (errors shown, sign-out errors logged).
Context: `docs/external/claude/2026-10-26-pr81-review.md` (findings 3, 4), `-pr80-review.md` (finding 2), site check of 27 Oct (documents filter).

## Done

- `account.tsx` reports `loadError` when the accounts, cottages or members read fails with nothing cached; `AppShell` shows the existing "Vaši chatu se nepodařilo načíst. / Zkusit znovu" card for it (before: an empty Home, or an app with no cottage or members). "Zkusit znovu" refetches the failed reads.
- `AppShell` shows "Načítání trvá déle než obvykle" with "Zkusit znovu" (reload) and "Přihlásit se znovu" after 10 s of loading the account, cottages or members (before: blank for good). A page's own reads are not covered.
- The error card's "Zkusit znovu" shows "Zkouším znovu…" and is disabled until the read succeeds or fails again (review). "Přihlásit se znovu" is shared with the start screen (`src/lib/sign-in-again.ts`).
- `SetPasswordForm`: each password field is named by its own `<label htmlFor>`, not "Heslo Zobrazit heslo".
- Documents: the title filter has an accessible name.

## Acceptance

- `bun run check` passes; `src/lib/t052.test.ts` tests `firstLoadError` and checks the wiring in the source (not behaviour; the behaviour evidence is the stub run below).
- Dev server with Supabase answers stubbed in Playwright (signed-in session, one membership): accounts read 500 → "Vaši chatu se nepodařilo načíst. Zkusit znovu" after the retries; cottages read hanging → "Načítání trvá déle než obvykle. Zkusit znovu / Přihlásit se znovu" at 13 s; all reads fine → Home; accounts read 500, then "Zkusit znovu" → card stays with "Zkouším znovu…" (disabled) and comes back when the read fails again; when it succeeds the card goes away.

Left for the backlog (review): offline mid-session with nothing cached (queries pause with `networkMode: "offlineFirst"`, so no error and no loading) still shows an empty app; a page's own hanging read has no 10 s way out; behavioural tests for the shell.

Handoff note: not verified on mychata.cz (needs a publish); "Přihlásit se znovu" from the app was not clicked in the stub run.
