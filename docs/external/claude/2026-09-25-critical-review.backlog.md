---
source: claude
model: claude-opus-5-5
date: 2026-09-25
updated: 2026-11-06
status: reviewed
artifact: https://claude.ai/code/artifact/de927c20-385c-481b-946a-49c085e87bf1
tab: Backlog
---

> Copy of the "Backlog" tab of the Claude doc "MyChata: tracker and critical review". The doc is the working copy; Claude refreshes this file whenever it edits that tab.

# Backlog

Open work that is not next yet. When a row becomes next, it moves to Now as an N row; when done, to Done & history.

## Open tasks

| ID | Task | Owner | Note | Status |
| --- | --- | --- | --- | --- |
| O-01 | Confirm Rajat ran `git config core.hooksPath .githooks` once | Rajat | He checks with `git config --get core.hooksPath` (must print `.githooks`). Collaborator since 12 Oct | Waiting |
| O-02 | A second GitHub admin | Both | A personal repo can't have one. Move it into a free GitHub organization you both own, together with own hosting (O-08); moving now risks disconnecting Lovable | Waiting |
| O-03 | Write down who holds the Lovable workspace, its publish button and billing; auto top-up yes or no | Both | Credits run out → the manual shows excerpts instead of AI answers | To do |
| O-04 | Tell members the public links changed | You | Old calendar and manual links and printed QR codes stopped working on 25 Sep | To do |
| O-05 | Monthly backup, a copy each | Both | Last full export 28 Sep; **next by 28 Oct**. The export has no uploaded photos or documents | To do |
| O-06 | Hold the database admin key | You | The export works (28 Sep); holding the key is unconfirmed | To do |
| O-07 | Repo public or private | Both | Also decides the AGPL question. A maintainer's e-mail from the T-022 brief stays in git history | To do |
| O-08 | Staging (T-003) → signed-in tests (T-004) → own hosting (T-002, Model B) | Claude, you | Before billing or a marketplace. Until staging exists, two-person tests run on production with test cottages | To do |
| O-09 | Error monitoring (T-006) and an alert both of you read | Claude, both | The nightly check was red for two weeks before anyone acted | To do |
| O-10 | T-014 performance, T-015 and T-016 missing tests (CP-1, Copilot) | Claude, Copilot | CP-1 also covers the rules T-018, T-021 and T-022 added | To do |
| O-11 | Legal basics: operator identity, terms, company, trademark, licence, AI data processing | You | mychata.cz still names no operator | To do |
| O-12 | Talk to 10 families and 3 institutions; 40 manual test questions (T-008) | You | | To do |
| O-13 | Notion: archive or reference only | You | | To do |
| O-14 | Later: billing (T-009), direct bookings and calendar sync (T-010, T-011) | Later | After O-08 | Waiting |
| O-15 | Shared editing of this doc (Claude Team plan) | Both | Optional; the repo is the shared tracker meanwhile | Waiting |
| O-16 | Visual redesign "Fresh air": L-5a, L-5b, L-5c live | You, Claude, Lovable | Rules in `docs/product/design.md`. Left: blue screens with real data (N-2), design questions D-02, D-06, D-10, D-11, cookie banner F-03 | Doing |
| O-17 | G-1: Gemini's Czech content | You | Needed before L-3 (N-5) | To do |
| O-18 | Pricing v2 build, steps P-1 to P-13 (Reference, section 10) | Claude, Lovable, you | After D-18. P-1 and P-10 can start now; P-2 to P-8 wait for staging (O-08); P-12 waits for O-11. Ships dark behind billing_enabled. Replaces the pricing part of O-14 | To do |
| O-20 | Left from the PR #82 review: offline mid-session with nothing cached (queries pause, so no error and no loading) still shows an empty app; a page's own hanging read (e.g. Home's bookings) has no 10 s way out; behavioural tests for the app shell instead of source checks | Claude | Review: docs/external/claude/2026-10-27-pr82-review.md | To do |
| O-21 | Older expense and split insert policies let any member enter an expense "paid by" someone else (found in the T-057 RLS audit, out of its scope). Tighten to: payer is the caller, or the caller is an admin; needs a migration and RLS tests | Claude | Next free migration number | In review |
| O-23 | An admin tapping Settings → "Public calendar link" publishes the calendar at once, with no question. On a Mac the link then opens the system share sheet, so nothing shows in the page. Decision 5 Nov: ask once. Done in PR #104 (T-062) | You, Claude | Site check 2026-11-05 | Done (live 149736b, 6 Nov) |
| O-24 | A stay may leave on its arrival day (0 nights), and the message says "Departure must be after arrival". Decision 5 Nov: allow for families and organisations. Done in PR #104 (T-062) with migration 0044; a day visit takes its whole day when checking clashes | You | Site check 2026-11-05 | Done (live 149736b, 6 Nov) |
| O-25 | Since T-059 nobody, admins included, can add a stay in the past from the app (the database would still take one). Should admins be able to record a stay that already happened, e.g. for expenses? Deferred by you, 5 Nov | You | PR #99 review, 2026-11-05 | Deferred |
| O-26 | Notifications → "Message from …" (Message the admin) leads nowhere: tapping keeps you on Notifications, no link to the stay, no way to answer. Carry the stay's id in the message (migration) and link to it | Claude | UX round 2026-11-05, U-7 | In review (PR #108, T-064, migration 0046) |
| O-27 | A stay request never approved stays "Awaiting approval" after its dates have passed (on the calendar, in no list). Built 6 Nov as "Not decided": grey on the calendar, listed on Calendar, no Approve; nothing expires in the database | You, Claude | UX round 2026-11-05, U-8 | In review (PR #108, T-064) |
| O-28 | Bottom bar labels are 12 px on a phone (15–16 px elsewhere). Larger labels must still fit five tabs at 375 px; design call | You, Claude | UX round 2026-11-05, U-9 | To do |
| O-29 | English wording mixes "chata" and "cottage" ("Your cottages" over "Add a chata"). Decision 6 Nov: "cottage" everywhere in English, except the brand name MyChata | You | UX round 2026-11-05, U-10 | In review (PR #108, T-064) |
| O-30 | A member's in-app day visit is never held for approval by the overlap rule (0028 counts nights; a day visit has none). The app still shows who else is there that day | Claude | PR #104 review, 2026-11-05 | To do |
| O-31 | zod 3 → 4 (advisory GHSA-mrhx-c7xc-m3w5, memory use on oversized input): a major version, planned as its own task with tests of every form | Claude | T-063, 2026-11-06 | In review (PR #109, T-065) |
| O-32 | Server-side input errors reach users badly (older than zod 4): the organisation's shared request form (host link) only checks for an "@", so jan@seznam or a note over 1000 characters leaves the button busy with no message; the House manual box shows a raw JSON error for a question over 500 characters. Catch and say it in plain words; limit the fields on the page | Claude | PR #109 review, 2026-11-06 | To do |

## Standing routines

- **Every Lovable batch:** a task brief with a file list first. After the batch, open a PR from `lovable-sync` into `main`, run the review prompts in `09` (the report is saved to `docs/external/claude/`), and merge only when the report shows `bun run check` passing on the last commit, because Lovable can't run it. Then check that Lovable's history shows the merge and that it still pushes to `lovable-sync`, publish, and run `10`.
- **Every Claude Code PR:** `09` too.
- **After every publish:** read the live commit from `<meta name="build-sha">` on `/auth` and note it in STATUS.md.
- Older prompt texts: [MyChata: agent prompts from the 26 Sep review](https://claude.ai/code/artifact/7b07f9c1-14fd-4777-8538-cd684a70538e).

---

Source file: `docs/external/claude/2026-09-25-critical-review.backlog.md` in the mychata repo.
