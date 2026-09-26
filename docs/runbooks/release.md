# Release checklist (Model A: Lovable publishes)

Copy this list into your notes for each release and tick it off. Raw logs go to the workspace `private/` folder, never into the repo (it is public, and logs contain sign-in tokens and e-mail addresses).

## Before publishing

- [ ] The latest commit on `main` has a green **CI** run (GitHub → Actions).
- [ ] New migrations? Ask Lovable to apply them exactly as written. If its migration tool needs a trigger, it adds an empty marker migration, never a copy (0018 is a copy of 0017 from before this rule; both ran, harmless, keep both). Pending files can run together in one batch, so each migration must be safe to run right after the previous one.
- [ ] Note the commit you are about to publish (short hash, e.g. `2905bc4`).

## Publish

- [ ] Publish in Lovable.
- [ ] Wait about a minute, then open https://mychata.cz in a fresh window.

## Five checks, with logs

Setup: desktop Chrome or Firefox without extra privacy shields (a phone or Brave run can follow). Open DevTools; in **Network** tick "Preserve log" and "Disable cache"; in **Console** tick "Preserve log". One check at a time; note the time of each.

| #   | Check                         | Success looks like                                                                                                                              | If it fails, capture                                    |
| --- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 0   | Page loads                    | Sign-in page appears; Console shows no red errors mentioning `mychata.cz` or `supabase` (B-002)                                                 | Every red Console line                                  |
| 1   | Sign in                       | You land on Home, not Onboarding; `rpc/claim_initial_membership` 200                                                                            | Failed row: name, status, Response tab                  |
| 2   | Make someone admin, then back | `rpc/set_member_role` 200/204 both times; the role label changes                                                                                | Error text (`last_admin`, `42501`, …)                   |
| 3   | Ask the manual a question     | `_serverFn` POST 200 and an answer appears                                                                                                      | Whether it reads like AI or a pasted excerpt; any error |
| 4   | Public calendar               | Kalendář → copy public link: `rpc/set_public_calendar` returns a token. In a private window the link shows the dates; `rpc/public_calendar` 200 | The URL opened; whether dates show                      |
| 5   | Guest request                 | Více → guest link; in a private window send a request; it appears on Home for the admin                                                         | The message on the form                                 |

The most useful line for a failure looks like: `rpc/add_property 403 {"code":"42501","message":"Admin role required"}`. Ignore blocked-tracker and font errors.

Save the logs: export the HAR ("sanitized" if the browser offers it) and the console to `private/Screenshots/<date> release/`, plus a short results file:

```
check | pass/fail | time | note
```

## After the checks

- [ ] Tag the published commit (not a newer one):
  - GitHub website: Releases → Draft a new release → Choose a tag → type `release-YYYY-MM-DD` → "Create new tag on publish" → Target: the published commit or `main` if nothing newer landed → Publish release.
  - Or terminal: `git fetch origin && git tag -a release-YYYY-MM-DD <hash> -m "<what is live>" && git push origin release-YYYY-MM-DD`
  - Tags are safe for Lovable's sync.
- [ ] Update the "Production" row in `docs/STATUS.md` (via the next pull request).
- [ ] The nightly production check (GitHub Actions, 05:17) passes the next morning.

## Rollback

In Lovable, restore the previous version and publish. Database changes are not rolled back automatically, so a migration must keep the previous release working.
