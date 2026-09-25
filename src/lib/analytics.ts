// Consent-gated Google Analytics (GA4) helper.
// The gtag script loads only after analytics consent, asynchronously, after
// first paint — it never blocks rendering. Events fired before consent (or
// while offline) wait in a small in-memory queue and flush once allowed.

const MEASUREMENT_ID = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY"] as string | undefined;
const QUEUE_CAP = 200;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let loaded = false;
let consentGranted = false;
const queue: Array<() => void> = [];

function flush() {
  while (queue.length) queue.shift()?.();
}

/** Call once consent is known. Loads gtag on first grant; applies Consent Mode v2. */
export function initAnalytics(analyticsConsent: boolean) {
  if (typeof window === "undefined" || !MEASUREMENT_ID) return;
  consentGranted = analyticsConsent;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag =
    window.gtag ??
    ((...args: unknown[]) => {
      window.dataLayer!.push(args);
    });
  if (!loaded) {
    loaded = true;
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  }
  window.gtag("consent", "update", { analytics_storage: analyticsConsent ? "granted" : "denied" });
  if (!analyticsConsent) return;
  if (!document.getElementById("ga4-script")) {
    const script = document.createElement("script");
    script.id = "ga4-script";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
    document.head.appendChild(script);
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID, { send_page_view: false });
  }
  flush();
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

/** Track a custom event. Queued until consent is granted; never throws. */
export function track(event: string, params: Record<string, unknown> = {}) {
  const send = () => {
    try {
      window.gtag?.("event", event, { ...sharedContext, ...params });
    } catch {
      /* never break the app for analytics */
    }
  };
  if (consentGranted && typeof window !== "undefined" && window.gtag) send();
  else if (queue.length < QUEUE_CAP) queue.push(send);
}

/** Page view on every client-side navigation (router subscribes to this). */
export function trackPageView(path: string) {
  if (!consentGranted || typeof window === "undefined" || !window.gtag || !MEASUREMENT_ID) return;
  try {
    window.gtag("event", "page_view", { page_path: path, ...sharedContext });
  } catch {
    /* ignore */
  }
}
