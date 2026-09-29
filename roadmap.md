## UI/wording pass (29 Sep 2026, verified) — UI only, no migrations/SQL/RLS/auth/server functions

- [x] 1. Chata switcher: header chata name opens sheet listing all chatas+accounts with role, switchAccount; "Add a chata" at bottom; keep Profile switcher
  - Scope note: sheet lists every account I belong to with role; cottages only for the active account (listing other accounts' cottages needs an RLS change — prohibited this pass)
- [x] 2. Home: primary "Přidat pobyt / Add booking" → /kalendar?book=true; whole "Next stay" card tappable
- [x] 4. Tasks: whole task tile opens /ukoly/$id
- [x] 5. Tab "Více/More" → "Nastavení/Settings" (route /vice); sections open with back arrow to Settings
- [x] 6. Guest/public calendar links: navigator.share() when available, else copy + toast "Odkaz zkopírován / Link copied"; never alert()
- [x] 7. Public calendar: inviting — chata name, month view free/booked colours, next free weekend highlighted, season, Share; no guest names; keep CZ/EN + invalid-link message
- [x] 8. Guest booking page: label dates "Příjezd/Arrival", "Odjezd/Departure"; admin reply wording change
- [x] 9. Expenses empty state: only one "Add expense" button
