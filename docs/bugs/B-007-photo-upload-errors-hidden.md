# B-007 Photo upload hides the real error; big iPhone photos fail

Reported: 2026-09-26 by walkthrough of mychata.cz · Status: fixed on branch `agent/claude/T-017-review-bugs` (not yet live)
Where: mychata.cz/fotky, iPhone Safari and desktop, family account
Screenshot: none
Steps to reproduce: upload a 6 MB HEIC photo from an iPhone, or upload while offline, or as a user whose storage insert is refused.
Expected / actual: expected a message saying what went wrong and what to do. Actual: always "Nahrání se nepodařilo." (`catch {}` dropped the error). `makePrimary` ignored the error of its first update, so a failure there looked like success until the second update hit the one-main-photo index.
Test that reproduces it: `src/lib/photos.test.ts` → "photo upload errors (B-007)", "photo resizing (B-007)".

Fix (`src/lib/photos.ts`, `src/routes/fotky.tsx`):

- `classifyUploadError` sorts failures into too large (413), wrong type (415 or a HEIC the browser can't decode), no permission (403 / `42501` / row-level security, i.e. the storage policies in 0002/0013 or the `property_photos` policy), network (fetch failures, offline), or other (shows the real message). Each has its own Czech/English text; wrong type explains the iPhone "Most Compatible" setting.
- `preparePhoto` resizes in the browser to max 2000 px on the long side and re-encodes as JPEG, lowering quality then size until ≈1 MB. Re-encoding also strips EXIF, so GPS positions in phone photos are no longer stored. Safari decodes HEIC, so iPhone photos are converted there.
- If the table insert fails after the file upload, the file is removed again.
- `makePrimary` and `remove` check every error and show it. The file input is reset and `busy` is cleared in `finally`, so the button is never left disabled and the same file can be picked again.

Not covered by an automated test: the canvas resize itself (needs a browser). Manual check: upload a 4032×3024 iPhone photo; in DevTools → Network the upload is ≤ ~1 MB and `image/jpeg`; turn on airplane mode and upload → connection message; button is enabled again afterwards.
