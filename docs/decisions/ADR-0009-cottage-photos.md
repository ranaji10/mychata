# ADR-0009 Cottage photos are shared, shrunk in the browser, and shown as previews

Status: accepted · Date: 2026-10-18

## Context

Bug 13 of 18 Oct asked how photos work when several members upload to one cottage, whether all
members see all photos, who sets the main photo, and what this costs in storage and load time.

How it already worked before this decision (migrations 0007 and 0013, `src/routes/fotky.tsx`,
`src/lib/photos.ts`):

- A photo belongs to the **cottage**, not to the person: one `property_photos` row per photo,
  file at `my-chata-files/<property id>/photos/<uuid>-<name>.jpg`. Every member of the account
  that owns the cottage sees every photo ("Members read photos"). Nothing is per-person.
- Any member can upload and pick the main photo ("Members set main photo"); one main photo per
  cottage (unique index). Only the person who uploaded a photo, or an admin, can delete it.
- Before upload the browser shrinks each photo to at most 2000 px on the long side and about
  1 MB (JPEG, 85→65 % quality, then smaller), which also strips the phone's EXIF data
  (including GPS). Phone originals are 4–12 MB, so storage is already 4–10 times smaller.
- But the photo grid and the Home picture downloaded those full ~1 MB files: a cottage with
  30 photos cost ~30 MB to open the Photos page, painful on a weak mobile signal at a chata.

Storage cost at today's size: 1 MB × 50 photos × 100 cottages ≈ 5 GB, within the Supabase
plan's included storage. Bandwidth (egress) grows with every view, so it matters more than
storage.

## Decision

1. Keep photos shared per cottage, visible to all its members, main photo set by any member,
   delete by uploader or admin. This matches how families use a chata (one album) and needs no
   change. Revisit when we add per-person or private photos, if ever.
2. Keep shrinking in the browser before upload (2000 px, ~1 MB): the full photo stays good
   enough to print or zoom.
3. **New:** at upload also store a preview of at most 1000 px and ~200 KB next to it
   (`…/photos/preview/<same name>`). The grid and Home show the preview; if it is missing
   (photos added before 18 Oct, or the preview upload failed) they show the full photo.
   Deleting a photo deletes both files. The grid images load lazily.
4. No server-side image transformation: Supabase's image transformations need a paid add-on,
   and doing it in the browser costs nothing.

## Consequences

- Opening Photos or Home downloads about a fifth of what it did for new photos; storage grows
  by about 20 % per photo.
- Photos uploaded before this change have no preview. A one-off backfill (download, shrink,
  upload) can be done later from a maintainer's browser if old cottages feel slow; not needed now.
- If a preview upload fails the photo is still saved; only the log shows it.
- Watch: egress in the Supabase dashboard after the next publish.
