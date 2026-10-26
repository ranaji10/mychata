// Google Analytics (GA4) helper.
// The gtag bootstrap + region-scoped Consent Mode v2 defaults are inlined in the
// root <head> (see __root.tsx) so the tag is always detectable and consent is
// set before any hit. This module only updates consent and sends events.

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Apply the visitor's choice (from the banner or saved). */
export function initAnalytics(analyticsConsent: boolean) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("consent", "update", { analytics_storage: analyticsConsent ? "granted" : "denied" });
}

export type AnalyticsContext = {
  account_type?: "family" | "institution" | "guest";
  language?: "cs" | "en";
  property_count?: number;
};

let sharedContext: AnalyticsContext = {};
export function setAnalyticsContext(ctx: AnalyticsContext) {
  sharedContext = ctx;
}

/**
 * User-scoped dimensions in GA4 (T-043): account type, role and language of the person using
 * the app. Never an id, name or email. Custom definitions with the same names exist in the
 * GA4 property (docs/runbooks/analytics.md).
 */
export function setUserProperties(props: {
  account_type?: "family" | "institution";
  member_role?: "admin" | "member";
  app_language?: "cs" | "en";
}) {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("set", "user_properties", props);
  } catch {
    /* never break the app for analytics */
  }
}

/**
 * D-27 (T-045): a pseudonymous user ID so GA counts one person across phone and computer.
 * It is the sign-in's internal id (a random UUID), never the email or name, and is sent only
 * after the visitor agreed to analytics. null clears it (sign-out, or consent withdrawn).
 */
export function setAnalyticsUserId(userId: string | null) {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("set", { user_id: userId ?? null });
  } catch {
    /* never break the app for analytics */
  }
}

/** Track a custom event. Consent Mode decides what Google stores; never throws. */
export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", event, { ...sharedContext, ...params });
  } catch {
    /* never break the app for analytics */
  }
}

/**
 * The page address Google may see (F-30, 26 Oct): link tokens and record ids replaced, no query
 * and no "#" part. Before this, page views carried the whole address, so the sign-in tokens an
 * e-mail link brings back in "#access_token=…" and the public-link tokens went to Google.
 * The head bootstrap in __root.tsx applies the same rules to the first hit (ANALYTICS_PATH_JS).
 */
export function analyticsPath(pathname: string): string {
  const s = pathname.split("/");
  if ((s[1] === "host" || s[1] === "pozvanka") && s[2]) s[2] = ":token";
  if (s[1] === "verejne" && s[3]) s[3] = ":token";
  if ((s[1] === "rezervace" || s[1] === "ukoly") && s[2] && s[2] !== "nova") s[2] = ":id";
  return s.slice(0, 4).join("/");
}

/** The same rules as an inline script for the head bootstrap (reads `location.pathname`). */
export const ANALYTICS_PATH_JS =
  "(function(){var s=location.pathname.split('/');" +
  "if((s[1]==='host'||s[1]==='pozvanka')&&s[2])s[2]=':token';" +
  "if(s[1]==='verejne'&&s[3])s[3]=':token';" +
  "if((s[1]==='rezervace'||s[1]==='ukoly')&&s[2]&&s[2]!=='nova')s[2]=':id';" +
  "return s.slice(0,4).join('/');})()";

/** Page view on every client-side navigation (one per page: F-31). */
export function trackPageView(path: string, title?: string) {
  if (typeof window === "undefined") return;
  const page_path = analyticsPath(path);
  const page_location = window.location.origin + page_path;
  try {
    // Every later hit, enhanced measurement's own events included, uses the cleaned address.
    window.gtag?.("set", { page_location, page_path });
  } catch {
    /* never break the app for analytics */
  }
  track("page_view", { page_path, ...(title ? { page_title: title } : {}), page_location });
}
