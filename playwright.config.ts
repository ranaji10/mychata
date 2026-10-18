// Smoke tests against a running site. Default: local preview. For staging or production:
//   E2E_BASE_URL=https://mychata.cz bun run e2e
// Signed-in flows need test accounts on a staging project (see docs/tasks/T-004-staging.md).
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: process.env["E2E_BASE_URL"] ?? "http://localhost:4173",
    viewport: { width: 390, height: 844 }, // mobile first, like the app
    // Cloud sessions ship a Chromium that doesn't match this Playwright's build (site check
    // 18 Oct): PW_CHROMIUM_PATH=/opt/pw-browsers/chromium bun run e2e. Unset in CI.
    launchOptions: { executablePath: process.env["PW_CHROMIUM_PATH"] || undefined },
  },
});
