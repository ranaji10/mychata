# T-001 Review, merge and apply the foundation branch

Owner: you (human) · Status: todo

Goal: get branch `agent/claude/foundation-2026-09-25` reviewed, merged and its migrations 0011–0015 applied to the database, without breaking the live app.

Steps:

1. Push the branch if it is not on GitHub yet, and open a PR into `main`.
2. Let CI run. Read every migration file yourself (invariant 2) or have an independent reviewer do it.
3. Merge with a normal merge commit (no squash or rebase: Lovable sync).
4. In Lovable, ask: "Apply the new migrations 0011 to 0015 from drizzle/migrations to the database, in order. Do not change them." Then publish.
5. Right after publishing, test: sign in; make someone admin and back; open the manual Q&A; copy the public calendar link from Kalendář and open it in a private window; create a guest link and submit a request from a private window.
6. Tell members that old public links and QR codes changed; re-share them.

If step 4 fails halfway: note which migration failed, don't publish, and ask Lovable for the exact error.
Acceptance: the five checks in step 5 work; `docs/STATUS.md` updated with the live commit.
