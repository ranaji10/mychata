---
source: claude
model: claude-opus-5-5
date: 2026-10-18
status: ready
artifact: none (prompt text, pasted into Lovable by a maintainer)
---

# Prompt 22 for Lovable: sync and publish check for T-039 (no migration)

Use after the T-039 PR (`agent/claude/T-039-post-publish-sync`) is merged and `lovable-sync` has caught up with `main`. No migration and no new Knowledge rules. The two app changes are small (a toast on the Calendar page, one line hidden for admins on the stay page), so Lovable only confirms it sees them and changes nothing. A maintainer publishes afterwards and runs `docs/runbooks/release.md`.

## Text to paste

```
Developer round T-039 is merged on GitHub (no database changes, no migration). Please do only this:

1. Sync with GitHub and tell me the latest commit you see. It must include "T-039: records after the T-038 publish, two small fixes, test updates". If you don't see it, stop and say so.

2. Don't change any code in this round, including src/integrations/supabase/types.ts. Knowledge rules 13–15 still apply (Czech head() titles, local dates, leave public/sw.js alone).

3. In your preview, signed in as your own test user in "Testovací chata (Lovable)" only (Knowledge rule 10), open a stay and the Calendar page and tell me whether either shows a console error.

4. Reply with the commit you saw and the result of step 3. Don't publish; I will.

If you need a platform or dependency update, do it in a separate commit and name it in your reply.
```

## After Lovable replies

- Commit right and no console errors: publish, then run the five checks in `docs/runbooks/release.md`.
- Read the live commit from `<meta name="build-sha">` on `/auth`, put it in `docs/STATUS.md`, and run `E2E_BASE_URL=https://mychata.cz bun run e2e` (7 tests; in a Claude cloud session add `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium`).

Source file: docs/external/claude/2026-10-18-lovable-prompt-22.md
