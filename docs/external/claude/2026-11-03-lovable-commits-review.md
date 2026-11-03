---
source: claude
date: 2026-11-03
status: reviewed
pr: 93
last_commit: bad7457
verdict: "Merge: yes after fixes 1-4, AGENTS.md line dropped or accepted, untested roadmap items unticked, CI green"
---

# Review of Lovable's L-3 commits (PR #93)

Fresh reviewer subagent, no context from whoever wrote or prompted the code. Condensed to its findings.

**Scope:** no forbidden path touched (migrations, supabase/, functions, integrations, env, package/lock, .github, .claude, decisions, db tests). AGENTS.md got one line from Lovable.

**Tenancy:** no findings. RPC names and arguments match 0038/types.ts; every RPC checks membership on the server; receipt paths start with the property id (0004 storage policy); note edit/delete also filter on the author; mention picker uses current members only; every Supabase call handles `error`.

**Medium**

1. Raw error codes shown to users ("Akce se nepodařila: nothing_owed").
2. "Napsat správci" shown to admins too; the only admin gets `no_admin`.
3. Editing a manual section moves it to the end (`display_order` sent on update).
4. Onboarding starter rules saved in one language into both fields (only /chaty maps the CS/EN pairs).

**Low**

5. Notifications: seen-keys list in localStorage grows forever; opening the page no longer clears computed items; `markStoredRead` unused.
6. Replacing a receipt leaves the old file in storage.
7. "Přidat pravidlo" adds a row with a single space.
8. Remind toast shows the whole debt at the cottage, not this expense's share.
9. STATUS.md: new heading placed between "Where things are" and its table.

**PR claims:** no real `bun run check` output from Lovable (CI ran green on #93); roadmap ticked items that were not exercised; Lovable left a temporary cottage "Lovable dočasná chata (test)" on production for a maintainer to delete.

**Content:** all strings in `src/lib/cottage-content.ts` match `docs/content/` word for word; capacity hint defined but not rendered; handover wording, red confirmation, MEMBERS_ONLY default, 44px targets, t() everywhere, no alert(), no personal data: pass.

Fixes: T-056 (findings 1–3, 9, AGENTS.md, roadmap). Finding 4 needs a function change; 5–8 left for later.
