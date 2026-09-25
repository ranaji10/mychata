---
name: release
description: Walk through a MyChata production release (Lovable publish), including migration application, tagging, smoke tests and STATUS update. Use when the user wants to publish or asks what is live.
---

Follow `docs/runbooks/release.md` step by step. Before step 3, confirm with the user that CI is green on the exact commit and which migrations Lovable has applied. After publishing, run the smoke workflow against https://mychata.cz and update the Production row in `docs/STATUS.md`. Never publish on the user's behalf without their explicit go-ahead.
