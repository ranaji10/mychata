# T-057 E-mails in one language, "I paid" claims, cottage facts, fixes from the 3 Nov test rounds

Owner: Claude (cloud session) · Status: review

Goal: what the maintainers asked for on 3 Nov 2026 afternoon, in one migration (0040) and one PR.
Non-goals: approval setting for family cottages (later, per maintainer); D-06 institution branding; pricing.
Files allowed: `drizzle/migrations/0040_language_payments_cottage_fields.sql`, its journal entry and snapshot, `supabase/security-allowlist.json`, `supabase/tests/{harness,security,t057}.test.ts`, `src/integrations/supabase/types.ts` (new columns, table, functions), e-mail templates and `src/lib/{email.server,notification-email,notification-queue.server,auth-email-lang,lang-store,payment-claims,notification-list,notifications,cottage-content,cottage-details,data,i18n,account,rpc-errors}.ts(x)`, `src/routes/lovable/email/auth/webhook.ts`, screens touched below, `src/components/{PaymentClaimActions,CottageDetailsEditor,CottageSetup,ExpenseDetail}.tsx`, tests, every file with the "My Chata" spelling, `docs/product/design.md`, `docs/STATUS.md`, `docs/generated/*`, this brief.
Invariants touched (AGENTS.md): 1 (new table with RLS, three definer functions with caller checks, one service-role-only function, one trigger), 2 (0040), 5, 6, 7.

## What

1. **One language per e-mail.** `profiles.preferred_lang` is saved whenever a signed-in person's chosen language differs from the last save (`account.tsx`). Sign-up passes `lang` in user metadata and `?lang=` in the return link; reset and resend pass `?lang=`. Sign-in e-mails: link → `email_lang()` (service role) → Czech. Notification e-mails: member/user → profile; an address → `email_lang()`, else the inviter's language; else Czech. Layout renders one language and sets `<html lang>`.
2. **T-055.** Before sending, the queue checks the subject still stands: stay still waiting, offer still pending, invitation still pending and unexpired, claim still open. Otherwise `email_error = 'withdrawn'`, not sent.
3. **"I paid" claims.** `payment_claims` (members of the account read; only functions write). `claim_payment(property, to, expense?)` by the person who owes (whole net debt to one person, or one expense's share); `decide_payment_claim(claim, received)` by the payee or an admin: received marks the shares paid like `settle_debt`, not received leaves them open. Both notify (`payment_claimed`, `payment_confirmed`, `payment_rejected`). A trigger closes an open claim when its shares get paid another way. Screens: Settle debts ("I've paid X" → "Waiting for X to confirm"; "Payments to confirm" with Yes/Not received), expense sheet ("I've paid my share"), Notifications.
4. **House rules members-only by default**: onboarding (now Czech and English separately, starter rules translated), Manage cottages, table default. Existing sections unchanged.
5. **Cottage facts**: `capacity`, `beds`, `check_in_time`, `check_out_time`, `pets_allowed`. Onboarding's "how many people" is the capacity; "Fill in" asks for capacity; Manage cottages has "Edit cottage details" and a facts line; a booking over capacity shows a warning (not a block).
6. **Fixes from the 3 Nov rounds**: "Approved by" on a pending stay → "Who decides"; reminders vanish once nothing is owed to their sender (`remind_debt` payload names the sender); manual suggestions saved under their own section (arrival, departure, neighbours); onboarding "May stays overlap?" always offers Yes/No (small cottages start on Yes); past pending requests go last in Approvals with only "Remove"; L-3 review Lows 5–8 (seen-keys list bounded, old receipt file removed on replace, blank rule lines dropped on save, reminder toast says it's the total).
7. **Brand**: "MyChata" everywhere in the app (wordmark, titles, link previews, help e-mail subject).

## Acceptance

- `bun run check` and `bun run test:db` pass; `supabase/tests/t057.test.ts` (language, facts, members-only rules, claims: claim, dedupe, refusals, payee/admin only, confirm marks paid, reject leaves open, trigger closes, reminder sender); `src/lib/t053.test.ts` (one language, T-055 withdrawn, language per recipient, reminder and claim list items); `src/lib/t057.test.ts`.
- Fresh reviewer and RLS auditor; reports in `docs/external/claude/`.

Handoff note: built as above. Not verified: 0040 on the real database (Lovable applies it); real mail apps; Lovable's auth hook passing `redirect_to` inside `url` (fallback is the stored language). Before 0040 is applied the app keeps working: claims read as empty, capacity isn't asked, saving the language logs an error.
