# B-019 Photos page shows "This page didn't load" after a reload

Reported: 2026-10-13 by Claude (T-026 live test, "Test chata (Claude)") · Status: fixed on branch `agent/claude/T-026-preview-and-defects`
Where: mychata.cz/fotky, any browser, any cottage that has at least one photo, after the page is reloaded or reopened within 7 days.
Screenshot: none (console: `TypeError: O?.get is not a function` in `fotky-*.js`)
Steps to reproduce: add a photo (or open Photos of a cottage that has one), reload the page.
Expected / actual: expected the photos. Actual: the error page, on every reload, until the browser's site data is cleared.
Test that reproduces it: synthetic browser check in `docs/tasks/T-026-preview-and-defects.md` (reload with a saved offline cache). Seen live on 13 Oct with a generated test photo in the test cottage; the photo was deleted afterwards.

Cause: the signed photo links were cached as a JavaScript `Map`. The offline cache (`mychata.offline-cache`) saves queries as JSON, which turns a Map into `{}`; after a reload the page called `.get()` on `{}`. The same 29 Sep problem as the members page (a `Set`).

Fix: the links are a plain object; signed links (photos and the main photo) are no longer saved in the offline cache at all, since they expire after an hour; the cache version (`buster`) is bumped so every browser drops its broken copy on the first visit after the release.
