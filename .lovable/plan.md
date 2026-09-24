# My Chata — Completion Plan

## Goal
Finish the remaining product requirements from both Notion documents while correcting the current family experience. Keep Czech as the default, support complete Czech/English switching, retain the accessible mobile-first design, and give institutional accounts a clearly different Teal Professional workspace.

## What is already built
- Family and institutional account modes with seeded personas; Petra Nováková is the first/default family admin.
- Shared cottage calendar, booking creation/detail, overlap detection, and green/yellow booking states.
- Tasks with assignment, due dates, status changes, overdue filtering, and seasonal templates.
- Equal expense splitting, settlement suggestions, and basic settlement marking.
- Handover checklist, notes, and history.
- Institutional public request form, conflict detection, individual approval/decline, and monthly CSV export.
- Public calendar, Czech/English interface, property house-rules and auto-confirm fields in the data model.

## Confirmed gaps to address
- Family bookings are currently blocked by overlaps, created as pending, and routed through approval; this conflicts with the updated family rules.
- The family dashboard still shows approval and small overdue tiles, and the detailed Next Stay card is too low.
- Stored task titles remain in their creation language; only fixed interface labels translate.
- Institutional mode shares almost all family styling.
- Expense custom/branch splits and receiver-only settlement confirmation are incomplete.
- Handover photos, issue reporting, booking linkage, and next-guest alerts are incomplete.
- Institutional bulk decisions and structured decline reasons are incomplete.
- The house manual, document vault, and offline-first system are not yet built.
- Current member selection is a prototype identity mechanism, not secure sign-in. Private/member-only documents require a real authorization foundation before production use.

## Phase 1 — Correct the family experience

### Family booking rules
- Make every family booking immediately `CONFIRMED`; family bookings never require approval.
- Permit all overlaps instead of disabling submission.
- While dates are being selected, show every overlapping stay with the member’s name and date range. Keep same-day changeover guidance separate from true overlap guidance.
- Preserve institutional request approval: public institutional requests remain `PENDING` until processed.
- Remove family approval actions and approval-only messaging from family routes; keep old links safe by redirecting family users to the calendar.

### Family home order
- Move the detailed **Next Stay** card to the first actionable position below the property header/image.
- Follow it with exactly two compact tiles: **Unsettled Expenses** and **Upcoming**.
- Remove the compact **To approve** and **Overdue** tiles.
- Keep the full-width **Overdue Tasks** section below the summary tiles.
- Preserve an appropriate empty state when there is no upcoming stay.

### Language control and stored task content
- Change the toggle labels everywhere from **ČJ / EN** to **CZ / EN**.
- Extend tasks with source language plus stored Czech and English titles/descriptions.
- On task creation or editing, detect the active language, preserve the original wording, and generate the other language through Lovable AI on the server.
- Render the language-matched stored version immediately when the user switches languages; never translate repeatedly during page rendering.
- Apply the same bilingual structure to seasonal-template tasks and backfill both translations for existing tasks, including the current Czech seeded tasks and the English task already in the database.
- If translation is temporarily unavailable, save the task safely and display the original text as a fallback until translation can be retried.

## Phase 2 — Distinct institutional workspace
- Apply the selected **Teal Professional** direction only to institutional accounts: teal `#087F8C`, pale teal `#E8F5F6`, white surfaces, and dark ink.
- Keep the family experience in the existing coral/cream Airbnb-warm style.
- Give institutional pages a more operational hierarchy: organization badge/header, request queue first, conflict and pending metrics, and denser but still 45–68-friendly rows.
- Retheme institutional navigation, active states, buttons, status emphasis, and dashboard sections through semantic account-mode tokens rather than scattered hardcoded colors.
- Keep shared controls, minimum 44px targets, high contrast, and mobile behavior consistent across both account modes.

## Phase 3 — Complete the original MVP workflows

### Expenses and settlement
- Add split modes: equal, custom amounts, and by family branch, with totals validated before saving.
- Replace unilateral “mark settled” with receiver-only confirmation. Record who confirmed and show pending/confirmed states to both sides.
- Keep the dashboard unsettled total aligned with the revised confirmation state.
- Add receipt-photo attachment where specified.

### Tasks and seasonal work
- Complete the explicit Open → In Progress → Done workflow in list and detail views.
- Add optional issue/completion photos and preserve bilingual task content through every edit.
- Allow a completed repair task to file its warranty into the Document Vault once that feature exists.

### Handover
- Link each handover to the relevant booking.
- Add inspection photo capture/upload.
- Add inline issue reporting that creates or links a maintenance task.
- Surface unresolved handover issues to the next booked member inside My Chata, with a clear acknowledgment state. External email/push delivery is not assumed unless separately configured.

### Institutional requests
- Add multi-select and bulk approve/decline while retaining individual actions.
- Require and store a structured decline reason, with an optional note.
- Show the exact conflicting stays when reviewing a request.
- Keep approved requests creating confirmed calendar bookings and extend CSV output with decision/conflict details.

## Phase 4 — Digital House Manual
- Add ordered, categorized manual sections with Czech and English title/body, optional photo, and `Public` or `Members only` visibility.
- Cover the specified content areas: Wi-Fi, boiler/heating, water shutoff, rubbish, emergency contacts, house rules, and other admin-created sections.
- Add an admin editor from **More** for create, edit, reorder, visibility, bilingual content, and photo management.
- Add a no-login public manual page that exposes only public sections.
- Add a copyable public link and downloadable/scannable QR code.
- Add **Flag as outdated** feedback with admin review/resolution.
- Fold the existing plain house-rules field into the manual without losing seeded rules.

## Phase 5 — Document Vault
- Add categorized documents: Insurance, Ownership, Utilities, Service Records, Warranties, and Other.
- Support upload, title, notes, category, issue/expiry dates, linked property/task, and visibility of **Admins only** or **All members**.
- Add search, category/visibility filters, document detail, replacement, download, and deletion.
- Store files privately and provide short-lived authorized download access; validate file type and size.
- Add 30-day expiry indicators and an in-app reminder list. Scheduled external reminders can be added only after a delivery channel is chosen.
- Add “File warranty” from a completed maintenance task.

## Phase 6 — Offline-first mode
- Make the app installable and cache the application shell.
- Persist the latest calendar, task lists, and active handover checklist on-device for offline reading.
- Queue supported offline changes for tasks and handover checklists, with a visible **Pending sync** marker.
- Add a concise online/offline banner and automatic replay when connectivity returns.
- Add update timestamps/version checks, detect server changes made since the offline copy, and present a simple keep-local/use-server conflict decision instead of silently overwriting.
- Keep file uploads and sensitive document downloads online-only, with clear messaging, to avoid unsafe or oversized offline storage.

## Data and security foundation
- Add the bilingual task fields, settlement confirmation state, handover issue/booking links, manual records, outdated flags, documents, reminders, and synchronization/version fields through database migrations.
- Create private storage areas for task, receipt, handover, manual, and vault files with file validation.
- Introduce real sign-in and server-verified account membership/roles before enabling Members-only manual sections or private vault documents in production. Roles remain separate from member/profile data.
- Replace open access with least-privilege rules: public visitors can read only explicitly public manual/calendar data and submit institutional requests; members see their account; admins manage restricted content.
- Preserve Petra as the seeded/default family admin persona for the demonstration data.

## Validation and delivery order
1. Ship and verify Phase 1 and Phase 2 first; these directly correct today’s visible behavior.
2. Complete and test the original MVP workflows in Phase 3.
3. Build the Manual and Vault after secure roles/storage are in place.
4. Add offline mode last, after the data structures and write workflows are stable.
5. For every phase, verify Czech and English, family and institutional accounts, overlap cases, empty/error states, mobile and desktop layouts, accessibility, database permissions, and a clean preview build.

## Explicitly deferred
- Social memory/photo feed and commercial room-by-room guesthouse booking remain deferred, matching the research document.
- Email, SMS, or push notifications are not included until a delivery provider and consent rules are selected; required alerts will first be delivered inside My Chata.
