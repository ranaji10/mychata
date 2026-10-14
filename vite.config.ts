// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { execSync } from "node:child_process";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Version marker (T-033): which commit and when this build was made, shown in every page's
// <head> as <meta name="build-sha"> and <meta name="build-time">. The commit comes from the
// build host's environment if it sets one, else from git; "unknown" if neither is there.
function buildSha(): string {
  for (const name of [
    "LOVABLE_COMMIT_SHA",
    "COMMIT_SHA",
    "GITHUB_SHA",
    "CF_PAGES_COMMIT_SHA",
    "WORKERS_CI_COMMIT_SHA",
    "VERCEL_GIT_COMMIT_SHA",
  ]) {
    const value = process.env[name];
    if (value && /^[0-9a-f]{7,40}$/i.test(value)) return value;
  }
  try {
    return execSync("git rev-parse HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "unknown";
  }
}

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    define: {
      __BUILD_SHA__: JSON.stringify(buildSha()),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  },
});
