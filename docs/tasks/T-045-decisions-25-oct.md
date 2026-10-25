# T-045 Decisions of 25 Oct 2026 (tracker D-02 to D-30)

Owner: Claude (cloud session) · Status: review

Goal: act on every decision the maintainer wrote into the tracker on 25 Oct that needs code or a setting.

Non-goals: pricing (D-18 to D-21 are unanswered), GA4 property switches and GitHub settings (accepting terms and changing settings are the maintainer's clicks; steps below), anything Lovable-only.

Invariants touched: 1 (two new definer functions, caller-checked; institution request policies), 2 (migration 0036), 5, 6, 7.

## Decisions and what was done

| ID   | Decision (maintainer)                                         | Done                                                                                                                                                                                                                    |
| ---- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-02 | Simulate a phone, act on it                                   | iPhone 13 emulation of `/auth`: the institution button looked like the e-mail one apart from a small icon. Now blue (`btn-secondary-institution`)                                                                       |
| D-03 | Owner only, six-month cooling off both ways, plan for pricing | Migration 0036 `change_account_type`; "Typ účtu" card on My profile; ADR-0013 (billing plan)                                                                                                                            |
| D-04 | Anna merges for now                                           | Runbook                                                                                                                                                                                                                 |
| D-05 | Approved: red style directly                                  | `AlertDialogAction` takes the button variant; delete confirmations use `destructive`; `ConfirmDialog` has `tone`                                                                                                        |
| D-09 | "I thought this is how it's designed"                         | Partly: `main` takes nothing without a PR, but Lovable's "Fix error" writes straight to `lovable-sync` and goes live on Publish without review. Runbook rule: don't press it; ask in a normal prompt                    |
| D-13 | Approved: glance at ruleset History                           | Release checklist line in the runbook                                                                                                                                                                                   |
| D-14 | Check the GitHub settings                                     | `main`: no force push (two rules). `lovable-sync - keep`: no deletion only, force pushes allowed. Steps to add it below                                                                                                 |
| D-15 | Isn't it needed for "ask the documents"?                      | Yes: switching `ai_documents` off stops Document Vault answers. Kept on; ADR-0004's question closed in STATUS                                                                                                           |
| D-16 | Only admins approve                                           | 0036: institution requests readable and decidable by admins only; members' Requests tab hidden. Members' bookings already follow the auto-approval answer (0032); guest and public-calendar requests already admin-only |
| D-17 | Approved: automatic docs:gen                                  | `.githooks/pre-commit` regenerates and stages `docs/generated/` when a commit touches migrations or routes (Lovable's commits skip hooks; CI still catches them)                                                        |
| D-22 | Make owner role                                               | 0036: one OWNER per account, `transfer_account_ownership`, "Předat vlastnictví" in Members                                                                                                                              |
| D-23 | Keep as is                                                    | Nothing                                                                                                                                                                                                                 |
| D-24 | Approved                                                      | Already in the runbook                                                                                                                                                                                                  |
| D-25 | "You owe" first, then cottage total                           | Home tile "Vy dlužíte", hint "Vám dluží … · Nevyrovnané v chatě celkem …", netted per pair like Settle debts (it summed gross shares)                                                                                   |
| D-26 | Yes: Google signals, user-provided data                       | Privacy page text. The GA4 switches need the maintainer to accept Google's terms (steps in `runbooks/analytics.md`)                                                                                                     |
| D-27 | Yes: pseudonymous user ID                                     | `setAnalyticsUserId` (sign-in UUID, only with analytics consent); privacy page line                                                                                                                                     |
| D-28 | Yes: live GA numbers                                          | `analytics-live.functions.ts` (GA4 Data API, service-account JWT, 6 h cache); falls back to the snapshot until `GA_PROPERTY_ID` and `GA_SERVICE_ACCOUNT_JSON` are set                                                   |
| D-29 | Yes: HEIC converter                                           | `heic-to` 1.6.6 (LGPL-3.0, 0.8 MB gzipped, browser-only chunk) for photos and avatars when the browser can't decode HEIC. Verified in Chromium with a generated HEIC                                                    |
| D-30 | Prompt the approver to invite                                 | Home: after approving a public-calendar request, "Pozvat … do chaty jako člena?" creates a MEMBER invitation and offers the e-mail                                                                                      |

## Not verified

- Migration 0036 against the real database (in-memory tests only); Lovable applies it.
- D-28 against Google: no key exists yet.
- HEIC from a real iPhone in Firefox; avatar path only by code.

## Fresh review (25 Oct) and what changed

Reviewer found nothing serious. Fixed: an account whose owner row has no sign-in now gets the next admin with a sign-in as owner (trigger on insert and update, plus the backfill demotes sign-in-less OWNER rows); an organisation with pending stay requests must decide them before becoming a family (`pending_requests`); Export and Notifications no longer query requests for members; the D-30 offer is skipped when the visitor is already a member or has a pending invitation. Accepted as is: the live-analytics server function is public (aggregate output, 6 h cache).

## After Lovable applies 0036

Every account should have an owner with a sign-in. In Lovable's SQL runner (read-only query):

```sql
select a.id, a.name from public.accounts a
where not exists (select 1 from public.members m
                  where m.account_id = a.id and m.role = 'OWNER' and m.user_id is not null);
```

Expected: none, or only accounts whose admins never signed in. Then check My profile → Typ účtu as each test account's founder.

## Added on 25 Oct, 11:40 (maintainer's answers)

- **Leaving:** "Odejít z účtu" at the bottom of Members & permissions. Members and admins leave after settling debts; the owner first offers ownership, the person offered accepts in Notifications or Members, and only then the old owner (now an admin) can leave. Functions in 0036: `offer_account_ownership`, `respond_account_ownership`, `cancel_account_ownership`, `my_ownership_offers`, `leave_account`; table `ownership_offers`.
- **Type change limit:** brand-new accounts may switch at once; the six months count from the first switch (already how 0036 works; wording on screen made explicit).
- **Settle check:** the database function settles both directions correctly (test with the Second Home numbers). The reported settle left no trace, so `settle_debt` now writes an audit row (`debt_settled`, with how many shares). Settle debts adds "(you)" or the e-mail's first part when two members share a name.
- **N-19 done:** GA4 Google signals and user-provided data on (25 Oct; automatic detection of user-provided data left off). **N-21 done:** `lovable-sync - keep` blocks force pushes.

Second fresh review (ownership and leaving): nothing serious. Fixed: members who left are marked (`members.left_at`, "Odešel/odešla" in Members) and left out of the pickers for new expenses and tasks; their open tasks go back to nobody (their stays stay in the calendar for an admin to decide); a double offer is serialised and worded; `settle_debt` logs only when something was settled; a null answer counts as declined.
