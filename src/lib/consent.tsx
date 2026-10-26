import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Cookie, X } from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { initAnalytics } from "@/lib/analytics";
import { getConsentRequired } from "@/lib/region.functions";
import { useLang } from "@/lib/i18n";

const LS_KEY = "mychata.consent";
const CONSENT_VERSION = "v1";
const TWELVE_MONTHS_MS = 1000 * 60 * 60 * 24 * 365;

interface ConsentChoice {
  analytics: boolean;
  version: string;
  at: number;
}

interface ConsentState {
  /** null = not decided yet */
  choice: ConsentChoice | null;
  decide: (analytics: boolean) => void;
  reopen: () => void;
  /** Close a reopened banner and keep the earlier choice. Only possible when one exists. */
  dismiss: () => void;
  /** The banner was reopened over an earlier choice, so it can be closed without choosing. */
  canDismiss: boolean;
  /** The choice in force: the earlier one while a reopened banner waits for a new one. */
  current: ConsentChoice | null;
}

const ConsentContext = createContext<ConsentState | null>(null);

function readChoice(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentChoice;
    if (parsed.version !== CONSENT_VERSION || Date.now() - parsed.at > TWELVE_MONTHS_MS)
      return null;
    return parsed;
  } catch {
    return null;
  }
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<ConsentChoice | null>(null);
  // The choice in force while the banner is reopened from Privacy & cookies (26 Oct request:
  // the reopened banner had no way to close it).
  const [previous, setPrevious] = useState<ConsentChoice | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const existing = readChoice();
    if (existing) {
      setChoice(existing);
      initAnalytics(existing.analytics);
      setReady(true);
      return;
    }
    // No saved choice: only EU/EEA/UK/CH visitors (or unknown) see the banner.
    getConsentRequired()
      .then(({ required }) => {
        if (!required) setChoice({ analytics: true, version: CONSENT_VERSION, at: 0 });
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const value = useMemo<ConsentState>(
    () => ({
      choice,
      decide: (analytics) => {
        const next = { analytics, version: CONSENT_VERSION, at: Date.now() };
        setPrevious(null);
        setChoice(next);
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        initAnalytics(analytics);
        // Best-effort consent log (GDPR record); never blocks the UI.
        void supabase
          .from("consent_log")
          .insert({ analytics, version: CONSENT_VERSION, anonymous_id: null, user_id: null })
          .then(({ error }) => {
            if (error) console.error("consent_log insert failed", error);
          });
      },
      reopen: () => {
        if (choice) setPrevious(choice);
        setChoice(null);
      },
      dismiss: () => {
        if (!previous) return;
        setChoice(previous);
        setPrevious(null);
      },
      canDismiss: !choice && !!previous,
      current: choice ?? previous,
    }),
    [choice, previous],
  );

  if (!ready) return <>{children}</>;
  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentState {
  const ctx = useContext(ConsentContext);
  if (!ctx)
    return {
      choice: { analytics: false, version: CONSENT_VERSION, at: 0 },
      decide: () => {},
      reopen: () => {},
      dismiss: () => {},
      canDismiss: false,
      current: { analytics: false, version: CONSENT_VERSION, at: 0 },
    };
  return ctx;
}

export function ConsentBanner() {
  const { choice, decide, canDismiss, dismiss } = useConsent();
  const { t } = useLang();
  const [customising, setCustomising] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // F-03: on phones the banner covered every sign-in option. It is now a compact sheet, and
  // the page gets room below it equal to its height, so everything can be scrolled into view.
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const root = document.documentElement;
    const apply = () => root.style.setProperty("--consent-h", `${el.offsetHeight}px`);
    apply();
    root.classList.add("has-consent-banner");
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.classList.remove("has-consent-banner");
      root.style.removeProperty("--consent-h");
    };
  }, [choice]);

  // A reopened banner starts on the short view again.
  useEffect(() => {
    if (choice) setCustomising(false);
  }, [choice]);

  if (choice) return null;

  return (
    <div
      ref={ref}
      data-consent-banner
      role="region"
      aria-label={t("Nastavení cookies", "Cookie settings")}
      className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[420px] md:max-w-[640px] md:p-3 lg:inset-x-auto lg:bottom-4 lg:right-4 lg:max-w-[440px]"
    >
      {/* Phones: a short sheet flush with the bottom edge (top corners rounded, room for the
          home bar). Tablets and computers: a floating card with the longer text. */}
      <div className="rounded-t-[28px] bg-card px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl md:rounded-[28px] md:p-5">
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-full bg-primary-soft text-primary md:size-11">
            <Cookie className="size-5 md:size-6" />
          </div>
          <h2 className="flex-1 text-[16px] font-bold md:text-lg">
            {t("Sušenky? Jen ty nejlepší.", "Cookies? Only the good kind.")}
          </h2>
          {canDismiss && (
            <button
              type="button"
              onClick={dismiss}
              aria-label={t("Zavřít a ponechat volbu", "Close and keep my choice")}
              className="-mr-1 grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
            >
              <X className="size-5" />
            </button>
          )}
        </div>
        <p className="mt-2 text-[14px] leading-snug text-muted-foreground md:mt-3 md:text-[16px] md:leading-relaxed">
          <span className="md:hidden">
            {t(
              "Nezbytné cookies vždy. Analytické jen s vaším souhlasem, bez reklam.",
              "Essential cookies always. Analytics only if you agree, no ads.",
            )}
          </span>
          <span className="hidden md:inline">
            {t(
              "Používáme nezbytné cookies, aby chata fungovala. Pokud nám dovolíte i analytické, pomůžete nám ji zlepšovat. Žádné reklamy, žádné prodeje dat.",
              "We use essential cookies to keep the cottage running. Allow analytics too and you help us improve it. No ads, no selling data.",
            )}
          </span>{" "}
          {/* A router link, so Back on the privacy page returns here (26 Oct request). */}
          <Link to="/soukromi" className="font-semibold text-primary underline underline-offset-2">
            {t("Co z nich vidíme", "What we see")}
          </Link>
        </p>
        {customising ? (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between rounded-2xl bg-secondary p-3">
              <span className="text-[16px] font-bold">{t("Nezbytné", "Essential")}</span>
              <span className="pill bg-ok-soft text-ok">{t("Vždy zapnuté", "Always on")}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="fresh"
                size="fresh"
                className="btn-secondary"
                onClick={() => decide(false)}
              >
                {t("Bez analytiky", "No analytics")}
              </Button>
              <Button
                variant="fresh"
                size="fresh"
                className="btn-primary"
                onClick={() => decide(true)}
              >
                {t("S analytikou", "With analytics")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button
              variant="fresh"
              size="fresh"
              className="btn-secondary"
              onClick={() => decide(false)}
            >
              {t("Jen nezbytné", "Essentials only")}
            </Button>
            <Button
              variant="fresh"
              size="fresh"
              className="btn-primary"
              onClick={() => decide(true)}
            >
              {t("Povolit vše", "Allow all")}
            </Button>
            <button
              type="button"
              className="col-span-2 min-h-11 text-[15px] font-semibold text-muted-foreground underline underline-offset-2"
              onClick={() => setCustomising(true)}
            >
              {t("Přizpůsobit", "Customise")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
