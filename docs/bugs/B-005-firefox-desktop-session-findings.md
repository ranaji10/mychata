# B-005 Firefox desktop session (26 Sep): what's real and what to do

Source: full report and raw captures in the workspace, `private/Screenshots/Brave macbook Firefox/` (not in the repo: the captures contain session data). Status: triaged; fixes in T-014.

| Finding                                                                                   | Verdict                                                                                         | Action                                                            |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `claim_initial_membership` runs inside a read query, 17 times in 25 min                   | Real. Harmless but wasteful write on every refetch                                              | T-014: run it once per sign-in                                    |
| 7 queries fire at once when the tab regains focus; some fail after sleep, then retry fine | Real, self-healing                                                                              | T-014: sensible `staleTime`; keep retries                         |
| `NetworkError` on house-manual server functions while re-embedding                        | Plausible. AI calls have no timeout                                                             | T-014: `AbortSignal.timeout` on AI calls, keyword-search fallback |
| 6 s CORS preflight, HTTP/3 protocol error on `/rest/v1/tasks`                             | Network-level, one session. Supabase hosted CORS settings can't be tuned from here              | Watch; revisit on own hosting (T-002)                             |
| `__cf_bm` cookie rejected                                                                 | Harmless browser warning                                                                        | None                                                              |
| One signing request per photo                                                             | Real, small                                                                                     | T-014: `createSignedUrls` in one call                             |
| Route storage through `files.mychata.cz`                                                  | Needs own Supabase + custom domain                                                              | Later, T-002                                                      |
| Send analytics through a first-party proxy so blockers can't stop it                      | **Rejected.** Circumventing people's tracker blocking conflicts with the consent-first approach | None                                                              |
| One aggregated query for the home screen                                                  | Premature at current scale                                                                      | Revisit when a page needs >1 s                                    |

New question raised by the capture: Lovable's own page-hit analytics (`POST /~api/analytics`, session id, user agent, path) runs on the site. Check whether it waits for cookie consent and list it on `/soukromi`.
