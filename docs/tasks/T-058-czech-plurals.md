# T-058 Czech plurals in the cottage facts line

Owner: Claude (cloud session) · Status: review

Goal: "1 pokoj, 3 pokoje, 6 pokojů" (and osoba/osoby/osob, lůžko/lůžka/lůžek; English person/people, room/rooms, bed/beds) on Manage cottages.
Files allowed: `src/lib/cottage-details.ts`, `src/lib/t057.test.ts`, `docs/external/claude/*`, `docs/STATUS.md`, this brief.
Acceptance: `bun run check`; the new plural test in `src/lib/t057.test.ts`.
