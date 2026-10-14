// Which commit this build came from, and when it was built (vite.config.ts, T-033). Read it on
// the live site in the page source: <meta name="build-sha"> and <meta name="build-time">.
export const BUILD_SHA: string = typeof __BUILD_SHA__ === "string" ? __BUILD_SHA__ : "unknown";
export const BUILD_TIME: string = typeof __BUILD_TIME__ === "string" ? __BUILD_TIME__ : "unknown";
