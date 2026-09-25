import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CONSENT_REGIONS } from "../lib/consent-regions";

const GA_ID = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY"] as string | undefined;

/** Runs before gtag.js loads: region-scoped Consent Mode v2 defaults + saved choice. */
function gtagBootstrap(id: string) {
  return `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;
gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',wait_for_update:500,region:${JSON.stringify(CONSENT_REGIONS)}});
try{var c=JSON.parse(localStorage.getItem('mychata.consent')||'null');if(c&&c.version==='v1'&&Date.now()-c.at<31536000000){gtag('consent','update',{analytics_storage:c.analytics?'granted':'denied'});}}catch(e){}
gtag('js',new Date());gtag('config',${JSON.stringify(id)},{send_page_view:false});`;
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "google-site-verification", content: "hWHZFgtJQ226BHwT__LZOK4_EErIe_jdWwb21NqiElk" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "My Chata — správa sdílené chaty" },
      {
        name: "description",
        content:
          "My Chata: kalendář pobytů, úkoly, výdaje a předání chaty pro rodiny i organizace. Jednoduše a přehledně.",
      },
      { property: "og:title", content: "My Chata — správa sdílené chaty" },
      {
        property: "og:description",
        content:
          "Kalendář pobytů, úkoly, výdaje a předání chaty pro rodiny i organizace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap",
      },
    ],
    scripts: GA_ID
      ? [
          { children: gtagBootstrap(GA_ID) },
          { src: `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`, async: true },
        ]
      : [],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="cs">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { AccountProvider } from "../lib/account";
import { LanguageProvider } from "../lib/i18n";
import { ConsentBanner, ConsentProvider } from "../lib/consent";
import { trackPageView } from "../lib/analytics";
import { Toaster } from "../components/ui/sonner";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  useEffect(() => {
    trackPageView(router.state.location.pathname);
    return router.subscribe("onResolved", ({ toLocation }) => trackPageView(toLocation.pathname));
  }, [router]);

  const persister = typeof window === "undefined" ? undefined : createSyncStoragePersister({ storage: window.localStorage, key: "mychata.offline-cache" });
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: persister ?? { persistClient: async () => undefined, restoreClient: async () => undefined, removeClient: async () => undefined }, maxAge: 1000 * 60 * 60 * 24 * 7 }}>
      <LanguageProvider>
        <AccountProvider>
          <ConsentProvider>
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
            <ConsentBanner />
            <Toaster position="top-center" richColors />
          </ConsentProvider>
        </AccountProvider>
      </LanguageProvider>
    </PersistQueryClientProvider>
  );
}

