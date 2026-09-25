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
  },
});
