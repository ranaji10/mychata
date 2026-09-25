# Pricing (draft, unvalidated)

Status: hypothesis. Talk to at least 10 families and 3 institutions before any number goes public. The database has matching draft rows in `plans` (migration 0015); nothing is charged.

| Tier        | Who                                    | Includes                                                                                                      | Price                                      |
| ----------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Family      | One family, up to 2 chatas             | Everything a family needs, including expenses and settlement; 20 AI questions a day                           | Free                                       |
| Family Plus | Families who rent out spare weeks      | Guest links, direct booking, calendar sync, guest registration and tourist-fee reports, more storage, more AI | To test (the old draft said 299 CZK/month) |
| Institution | Universities, unions, companies, clubs | Request queue, eligibility rules, audit log, CSV/ISDOC export, SSO later                                      | Per property per year, invoiced            |

Why the Free tier keeps expenses: expense sharing is the reason relatives join, and every invited relative is distribution.

Institutions often pay by invoice (IČO/DIČ, bank transfer with QR code), sometimes via procurement or a social fund (FKSP). Card checkout alone won't close them. See `../architecture/billing.md`.

Commission rates per tier (the old 12%/8%/5%) are parked until a marketplace exists.
