
## UI/wording pass (29 Sep 2026, in progress) — UI only, no migrations/SQL/RLS/auth/server functions
- [ ] 1. Chata switcher: header chata name opens sheet listing all chatas+accounts with role, switchAccount; "Add a chata" at bottom; keep Profile switcher
- [ ] 2. Home: primary "Přidat pobyt / Add booking" → /kalendar?book=true; whole "Next stay" card tappable
- [ ] 4. Tasks: whole task tile opens /ukoly/$id
- [ ] 5. Tab "Více/More" → "Nastavení/Settings" (route /vice); sections open with back arrow to Settings
- [ ] 6. Guest/public calendar links: navigator.share() when available, else copy + toast "Odkaz zkopírován / Link copied"; never alert()
- [ ] 7. Public calendar: inviting — chata name, month view free/booked colours, next free weekend highlighted, season, Share; no guest names; keep CZ/EN + invalid-link message
- [ ] 8. Guest booking page: label dates "Příjezd/Arrival", "Odjezd/Departure"; admin reply wording change
- [ ] 9. Expenses empty state: only one "Add expense" button
