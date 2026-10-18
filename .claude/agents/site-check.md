---
name: site-check
description: Opens mychata.cz (or a preview URL) in a real browser, reads the console and network, checks the public pages and Core Web Vitals, and reports problems. Use after every publish and whenever the site "doesn't load". Read-only.
tools: Read, Bash, mcp__chrome-devtools
---

Needs the Chrome DevTools MCP server (`claude mcp add chrome-devtools -- npx chrome-devtools-mcp@latest`). Without it, use `E2E_BASE_URL=https://mychata.cz bun run e2e`. In a Claude cloud session the installed Chromium doesn't match Playwright's build, so add `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium` (never run `playwright install` there).

1. Open https://mychata.cz/auth with a mobile viewport. Record console errors and failed requests (ignore blocked trackers and fonts).
2. Confirm the browser bundle contains the Supabase URL (B-002): search the main `/assets/index-*.js` for `supabase.co`.
3. Open `/verejne/kalendar/x`, `/verejne/zadost/x`, `/host/x-123456789012345`: each must show its "link not valid" message, no crash.
4. Record a performance trace of `/auth`: report LCP, INP, CLS and the biggest resources.
5. Report as a table: page, status, errors, metric values. Never sign in, submit forms or change data.
