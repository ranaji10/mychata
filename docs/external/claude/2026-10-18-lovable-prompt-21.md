---
source: claude
model: claude-opus-5-5
date: 2026-10-18
status: ready
artifact: none (prompt text, pasted into Lovable by a maintainer)
---

# Prompt 21 for Lovable: publish check for T-038 (no migration)

Use after PR #52 (T-038), PR #53 (its review) and the follow-up PR with the review fixes are merged, and `lovable-sync` has caught up with `main` (the sync workflow does that after each merge). There is **no migration** in this round, so Lovable only has to confirm it sees the code, leave it alone, and look at four screens in its own test cottage. A maintainer publishes afterwards and runs `docs/runbooks/release.md`.

Also paste the three new Knowledge rules (13–15) from `docs/external/lovable/KNOWLEDGE.md` into Lovable's Knowledge before sending the prompt.

## Text to paste

```
Developer round T-038 is merged on GitHub (no database changes, no migration). Please do only this:

1. Sync with GitHub and tell me the latest commit you see. It must include "T-038: fixes from the signed-in live test of 18 Oct" and the follow-up "T-038 review fixes". If you don't see them, stop and say so.

2. Don't change any code in this round. In particular, leave these as they are:
   - src/lib/page-title.ts and the PageTitleSync component in src/routes/__root.tsx (tab titles in the chosen language),
   - the Czech titles in each route's head() (for example "Domů — My Chata", not "Home — My Chata"),
   - public/sw.js (its cache is now named "my-chata-v2" and it must never store "/_serverFn/" requests),
   - src/lib/public-calendar.ts, src/lib/data.ts (localISO, manualCategoryLabel) and src/lib/invites.ts (calendarDaysUntil).

3. In your preview, signed in as your own test user in "Testovací chata (Lovable)" only (Knowledge rule 10), check and report pass or fail for each:
   a. Home: "Nejbližší pobyt" appears once (the card), the photo's bottom chip says "Kalendář / Všechny pobyty a volné dny", and "Odjezdové úkoly" shows only if the stay has already started.
   b. Browser tab title: "Domů — My Chata" in Czech; after tapping EN it changes to "Home — My Chata"; after CZ it changes back.
   c. Manual: the section category shows a word ("Pravidla domu", "Wi-Fi"), not a code like "RULES"; the category picker in "Nová sekce" shows words too.
   d. Settings: if you are the cottage's admin you still see "Veřejný odkaz na kalendář"; tapping it copies a link and shows no error.

4. Reply with the commit you saw, the four results, and any console errors from the preview. Don't publish; I will.

If you need a platform or dependency update, do it in a separate commit and name it in your reply.
```

## After Lovable replies

- All four pass and the commit is right: publish, then run the five checks in `docs/runbooks/release.md`.
- Then the checks that need people (tracker N-10): as Test 2 in `Chata Alfa (test)`, an overlapping booking shows "Poslat ke schválení" and the held stay has "Stáhnout žádost"; as Test 1, Home lists the held stay under "Pobyty ke schválení" and Approve on the stay page confirms it.
- Read the live commit from `<meta name="build-sha">` on `/auth` and put it in `docs/STATUS.md`.

Source file: docs/external/claude/2026-10-18-lovable-prompt-21.md
