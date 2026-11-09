# T-069 Public-calendar requests on institution cottages; sign-out hardening

Owner: Claude (cloud session) · Status: review

Goal: close the gap found in the 9 Nov N-29 test. Since 29 Sep (T-021) Settings and Calendar offer the public calendar to family cottages only, but the database still serves it for institutions (`public_calendar` / `request_public_booking` handle `INSTITUTIONAL`, the public page brands it blue). An institution cottage with the flag on (Institutní chata (test) is one) shows its calendar to anyone holding the request-form token (same token, `/verejne/kalendar/` instead of `/verejne/zadost/`) and accepts booking requests, while its admin can neither see nor switch it off. Those requests are listed on Home only; the "Pending requests" tile counted employee-form requests only (said 0 with one waiting) and linked to Requests, which did not mention them.

Non-goals: deciding whether institutions should have a public calendar (D-35); moving public-calendar requests into the Requests list; any database change.

Files allowed: `src/routes/vice.tsx`, `src/routes/domu.tsx`, `src/routes/zadosti.tsx`, `src/lib/sign-out.ts`, `src/lib/t069.test.ts` (new), `docs/STATUS.md`, this brief, tracker copies.

Invariants touched: 5 (new text through `t()`), 6 (sign-out error handled).

## What changes

1. Settings: an institution admin sees "Vypnout veřejný kalendář" while the calendar is on. The confirmation says the request form keeps working (switching off does not rotate the token).
2. Home: the "Pending requests" tile adds pending public-calendar requests.
3. Requests: a card "Žádosti z veřejného kalendáře: N. Vyřídíte je na Domů." links to Home while any wait.
4. `signOutHere`: a local sign-out that throws (auth-js 2.119 rethrows a `SIGNED_OUT` listener's error after removing the session) is handled like a returned error; the session check decides.

## Acceptance

- `t069.test.ts`: 4 tests, all fail on main, pass here. `bun run check` exit 0; `bun run build` exit 0.
- After publish, as Test 3 on Institutní chata (test): tile counts the pending public-calendar request; Requests shows the card; Settings shows the switch-off row (do not press it unless D-35 says so).
