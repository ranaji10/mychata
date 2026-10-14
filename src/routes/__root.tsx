import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { LanguageProvider, LanguageToggle, useLang } from "@/lib/i18n";
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
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CONSENT_REGIONS } from "../lib/consent-regions";
import { brandAssets } from "../lib/brand-assets";

const GA_ID = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY"] as
  string | undefined;

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
    <LanguageProvider>
      <NotFoundBody />
    </LanguageProvider>
  );
}

function NotFoundBody() {
  const { t } = useLang();
  return (
    <main className="page-fresh flex min-h-screen flex-col items-center justify-center gap-6 px-5 text-center">
      <span className="grid size-11 place-items-center rounded-[14px] bg-primary text-primary-foreground">
        <Home className="size-6" />
      </span>
      <h1 className="text-[28px] font-extrabold">
        {t("Stránka nebyla nalezena", "Page not found")}
      </h1>
      <p className="max-w-md text-muted-foreground">
        {t(
          "Tato stránka neexistuje nebo byla přesunuta.",
          "This page does not exist or has been moved.",
        )}
      </p>
      <Button asChild variant="fresh" size="fresh" className="btn-primary">
        <Link to="/">{t("Zpět na úvod", "Go home")}</Link>
      </Button>
      <LanguageToggle />
    </main>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  return (
    <LanguageProvider>
      <ErrorBody error={error} reset={reset} />
    </LanguageProvider>
  );
}

function ErrorBody({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const { t } = useLang();
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <main className="page-fresh flex min-h-screen flex-col items-center justify-center gap-6 px-5 text-center">
      <span className="grid size-11 place-items-center rounded-[14px] bg-primary text-primary-foreground">
        <Home className="size-6" />
      </span>
      <h1 className="text-[28px] font-extrabold">
        {t("Stránku se nepodařilo načíst", "This page did not load")}
      </h1>
      <p className="max-w-md text-muted-foreground">
        {t(
          "Zkuste stránku obnovit nebo se vraťte na úvod.",
          "Try refreshing the page or go back home.",
        )}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild variant="fresh" size="fresh" className="btn-primary">
          <a href="/">{t("Zpět na úvod", "Go home")}</a>
        </Button>
        <Button
          variant="fresh"
          size="fresh"
          className="btn-secondary"
          onClick={() => {
            router.invalidate();
            reset();
          }}
        >
          {t("Zkusit znovu", "Try again")}
        </Button>
      </div>
      <LanguageToggle />
    </main>
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
        content: "Kalendář pobytů, úkoly, výdaje a předání chaty pro rodiny i organizace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      // Link-preview image from brand/ (bun run brand). Lovable must not set its own.
      { property: "og:image", content: brandAssets.ogImage },
      { property: "og:image:width", content: String(brandAssets.ogImageWidth) },
      { property: "og:image:height", content: String(brandAssets.ogImageHeight) },
      { property: "og:image:alt", content: "My Chata" },
      { name: "twitter:image", content: brandAssets.ogImage },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      // Tab and home-screen icons from brand/ (bun run brand); never Lovable's.
      { rel: "icon", href: brandAssets.icon32, type: "image/png", sizes: "32x32" },
      { rel: "icon", href: brandAssets.favicon, sizes: "any" },
      { rel: "apple-touch-icon", href: brandAssets.appleTouchIcon },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
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
import { ConsentBanner, ConsentProvider } from "../lib/consent";
import { trackPageView } from "../lib/analytics";
import { Toaster } from "../components/ui/sonner";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  useEffect(() => {
    trackPageView(router.state.location.pathname);
    return router.subscribe("onResolved", ({ toLocation }) => trackPageView(toLocation.pathname));
  }, [router]);

  const persister =
    typeof window === "undefined"
      ? undefined
      : createSyncStoragePersister({ storage: window.localStorage, key: "mychata.offline-cache" });
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: persister ?? {
          persistClient: async () => undefined,
          restoreClient: async () => undefined,
          removeClient: async () => undefined,
        },
        maxAge: 1000 * 60 * 60 * 24 * 7,
        // Signed photo links expire after an hour, so a saved copy is useless offline and
        // shows a broken picture after a reload; keep them out of the offline cache (T-026).
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === "success" &&
            !["property-photo-urls", "primary-photo"].includes(String(query.queryKey[0])),
        },
        // Bump when a cached query changes shape, so old saved copies are dropped instead of
        // crashing a page (29 Sep: the members page cached a Set, which JSON turns into {}).
        buster: "2026-10-13",
      }}
    >
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
