# Release (Model A: Lovable publishes)

1. The commit on `main` you are about to publish has a green CI run.
2. Any new migration was applied by Lovable and nothing failed (ask Lovable to list applied migrations if unsure).
3. Publish in Lovable.
4. Tag it: `git tag release-YYYY-MM-DD-<short sha> <sha> && git push origin release-YYYY-MM-DD-<short sha>` (tags are safe for Lovable sync).
5. Smoke test on mychata.cz: sign in, open Home, calendar, manual; open one public link in a private window. With CI: run the workflow manually with `e2e_base_url = https://mychata.cz`.
6. Update the "Production" row in `docs/STATUS.md`.

Rollback: in Lovable, restore the previous version and publish; database changes are not rolled back automatically, so migrations must stay backwards-compatible for one release.
