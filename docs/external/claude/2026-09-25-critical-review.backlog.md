---
source: claude
model: claude-opus-5-5
date: 2026-09-25
updated: 2026-10-27
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
| O-19 | Loading states left from the PR #80/#81 reviews: an accounts-only read failure shows an empty Home with no "Zkusit znovu"; a hanging properties/members read leaves the app blank with no fallback; SetPasswordForm's eye button joins the password fields' names | Claude | Fixed in PR #82 (T-052, 27 Oct), plus the documents filter's missing name found in the 27 Oct site check; merge and publish = N-28. Reviews: docs/external/claude/2026-10-26-pr80-review.md, -pr81-review.md | Doing |
| O-20 | Left from the PR #82 review: offline mid-session with nothing cached (queries pause, so no error and no loading) still shows an empty app; a page's own hanging read (e.g. Home's bookings) has no 10 s way out; behavioural tests for the app shell instead of source checks | Claude | Review: docs/external/claude/2026-10-27-pr82-review.md | To do |

## Standing routines

- **Every Lovable batch:** a task brief with a file list first. After the batch, open a PR from `lovable-sync` into `main`, run the review prompts in `09` (the report is saved to `docs/external/claude/`), and merge only when the report shows `bun run check` passing on the last commit, because Lovable can't run it. Then check that Lovable's history shows the merge and that it still pushes to `lovable-sync`, publish, and run `10`.
- **Every Claude Code PR:** `09` too.
- **After every publish:** read the live commit from `<meta name="build-sha">` on `/auth` and note it in STATUS.md.
- Older prompt texts: [MyChata: agent prompts from the 26 Sep review](https://claude.ai/code/artifact/7b07f9c1-14fd-4777-8538-cd684a70538e).

---

Source file: `docs/external/claude/2026-09-25-critical-review.backlog.md` in the mychata repo.
