# T-061 Back arrow on the public request form

Owner: Claude (cloud session) · Status: review

Goal: an admin who opens Settings → "Public request form" (organisations) can go back to the app; on 5 Nov the page had no way back.

The arrow shows only when the browser has an app page to return to (TanStack Router `useCanGoBack`), so staff who open the shared link see no arrow that leads nowhere.

Non-goals: the public calendar, manual and guest pages (opened from shared links, never from inside the app); the dependency alerts (answered in chat, 5 Nov).

Files allowed: `src/routes/verejne.zadost.$token.tsx`, `src/lib/t061.test.ts`, `docs/STATUS.md`, this brief.

Invariants touched (AGENTS.md): 5 (label through `t()`, 44 px target).

Acceptance: `bun run check`; after publish, Settings → Public request form → the arrow returns to Settings; the same link opened in a new tab shows no arrow.
