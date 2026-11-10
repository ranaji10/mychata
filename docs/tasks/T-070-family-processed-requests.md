# T-070 Processed requests for families

Owner: Claude (planner and implementer) · Status: review

Goal: a family admin's Requests page keeps a "Processed" list, as the institution page does, so a request does not vanish without trace once decided (asked 10 Nov after the N-42 check).
Non-goals: no schema change; no change to the institution list; declined members' stays stay deleted (they are removed by the Decline on the stay page, so there is nothing to list); no paging.
Files allowed: `src/routes/zadosti.tsx`, `src/lib/guest-requests.ts`, `src/lib/t070.test.ts`, `src/lib/t069.test.ts` (only if a T-069 assertion must follow), `docs/STATUS.md`, this file.
Invariants touched (AGENTS.md): 5 (Czech first, 44px), 6 (every Supabase call handles `error`).
Context: `docs/tasks/T-069-institution-public-calendar.md`, ADR-0014, `src/components/PublicRequests.tsx`, `docs/external/claude/2026-11-10-site-check.md`.

Acceptance (runnable):

- `bun run check` passes; `src/lib/t070.test.ts` passes.
- Family admin, after declining a public request: Requests shows "Processed" with the request, its dates, where it came from and "Declined" (live check after publish, on Test 5's test cottage).
- An approved held member stay is listed as "Approved" with "Member's stay"; a public request approved is listed once (not again as the stay it created).
- The empty state ("No requests.") shows only when nothing waits and nothing was decided.

What it lists: the 20 most recently decided public requests (`guest_requests`, status not PENDING, newest decision first) and the members' held stays an admin approved (`bookings` with `requester_member_id`, `approved_at`, not `auto_approved`), merged newest first, 20 at most.

Handoff note: see the PR's Verification section.
