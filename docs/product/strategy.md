# Strategy to V3

Decision (2026-09-25): win the owner's side of the chata first, then send idle weeks to direct bookings, and only then aggregate demand. No head-on marketplace before there is supply density.

## Why not a marketplace first

Marketplaces win on guest demand, which Airbnb and Booking buy at a scale MyChata can't match. Airbnb moved most hosts to a single host-only fee of about 15.5% from October 2025 ([Hostaway](https://www.hostaway.com/blog/airbnb-host-only-fee-what-to-know-about-the-15-percent-host-fee/)), so undercutting on commission is a thin wedge. A 0% direct booking the owner controls is a thicker one.

## Stages

| Stage | Move                                                                                                                    | Proof metric                                                    |
| ----- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| V1.5  | Families and institutions run their chata in MyChata                                                                    | Weekly active chatas; chatas with 3+ active members             |
| V2    | Idle weeks to direct bookings: guest links, deposits, guest registration, tourist-fee report, registration-number field | Share of chatas with a live guest link; direct nights per chata |
| V2    | Two-way iCal with Airbnb and Booking; later a channel-manager partner                                                   | Chatas syncing an external calendar                             |
| V2.5  | Chata swap between verified owners, points-based (HomeExchange model)                                                   | Swap nights per month                                           |
| V3    | Public discovery for opted-in chatas, region by region; AI search once a region has supply                              | Bookable chatas per region                                      |

## Regulation that shapes V2/V3

- EU Regulation 2024/1028 applies from 20 May 2026: registration numbers and platform data sharing ([EUR-Lex summary](https://eur-lex.europa.eu/EN/legal-content/summary/online-short-term-accommodation-rental-services-data-collection-and-sharing.html)).
- Czech eTurista register missed its 1 July 2026 launch and is being reworked; guest book, Ubyport for foreign guests and the local tourist fee still apply ([Hostivio](https://hostivio.cz/en/eturista/)). Re-check before building T-010.
- A marketplace also brings Digital Services Act duties (trader traceability), DAC7 income reporting and payment regulation. Legal review before V3.

## Not before supply exists

Native app, microservices, Next.js, experiences marketplace, insurance, white-label.
