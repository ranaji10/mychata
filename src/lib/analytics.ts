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

/** Track a custom event. Consent Mode decides what Google stores; never throws. */
export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", event, { ...sharedContext, ...params });
  } catch {
    /* never break the app for analytics */
  }
}

/** Page view on every client-side navigation. */
export function trackPageView(path: string, title?: string) {
  track("page_view", {
    page_path: path,
    ...(title ? { page_title: title } : {}),
    page_location: typeof window !== "undefined" ? window.location.href : path,
  });
}
