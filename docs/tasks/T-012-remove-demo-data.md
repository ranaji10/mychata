# T-012 Remove demo data from production

Owner: you · Status: todo · Irreversible, so a person decides
Context: the first migration seeded "Rodina Novákových" (4 members at example.cz) and the fake institution "Vysoká škola podhorní" with bookings, tasks and expenses. Your own accounts may have been linked to these seed members by hand.
Steps: check which real users are linked (`docs/runbooks/remove-demo-data.sql`, part 1, read-only) → decide → run part 2 in a transaction → confirm counts.
