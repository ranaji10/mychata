# T-006 Error monitoring and release tags

Status: todo · Needs a Sentry (EU region) account and DSN
Goal: client and server errors reported with `release` = commit SHA, behind the existing consent for anything beyond errors. Keep Lovable's error reporting until T-002.
Files allowed: src/lib/error-capture.ts, src/start.ts, src/server.ts, package.json
Acceptance: a thrown test error appears in Sentry with the right release.
