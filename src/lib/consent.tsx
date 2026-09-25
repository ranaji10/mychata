import { Cookie } from "lucide-react";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { initAnalytics } from "@/lib/analytics";
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
}

const ConsentContext = createContext<ConsentState | null>(null);

function readChoice(): ConsentChoice | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentChoice;
    if (parsed.version !== CONSENT_VERSION || Date.now() - parsed.at > TWELVE_MONTHS_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function ConsentProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<ConsentChoice | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const existing = readChoice();
    setChoice(existing);
    initAnalytics(existing?.analytics ?? false);
    setReady(true);
  }, []);

  const value = useMemo<ConsentState>(
    () => ({
      choice,
      decide: (analytics) => {
        const next = { analytics, version: CONSENT_VERSION, at: Date.now() };
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
          .then(() => undefined);
      },
      reopen: () => setChoice(null),
    }),
    [choice],
  );

  if (!ready) return <>{children}</>;
  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>;
}

export function useConsent(): ConsentState {
  const ctx = useContext(ConsentContext);
  if (!ctx) return { choice: { analytics: false, version: CONSENT_VERSION, at: 0 }, decide: () => {}, reopen: () => {} };
  return ctx;
}

export function ConsentBanner() {
  const { choice, decide } = useConsent();
  const { t } = useLang();
  const [customising, setCustomising] = useState(false);
  if (choice) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[420px] p-3">
      <div className="card border border-border p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
            <Cookie className="size-6" />
          </div>
          <h2 className="text-lg font-bold">{t("Sušenky? Jen ty nejlepší.", "Cookies? Only the good kind.")}</h2>
        </div>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          {t(
            "Používáme nezbytné cookies, aby chata fungovala. Pokud nám dovolíte i analytické, pomůžete nám ji zlepšovat. Žádné reklamy, žádné prodeje dat.",
            "We use essential cookies to keep the cottage running. Allow analytics too and you help us improve it. No ads, no selling data.",
          )}
        </p>
        {customising ? (
          <div className="mt-4 space-y-3">
            <label className="flex items-center justify-between rounded-2xl bg-secondary p-3">
              <span className="text-[15px] font-bold">{t("Nezbytné", "Essential")}</span>
              <span className="pill bg-ok-soft text-ok">{t("Vždy zapnuté", "Always on")}</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-secondary" onClick={() => decide(false)}>
                {t("Bez analytiky", "No analytics")}
              </button>
              <button className="btn-primary" onClick={() => decide(true)}>
                {t("S analytikou", "With analytics")}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 grid gap-2">
            <button className="btn-primary" onClick={() => decide(true)}>
              {t("Pomáhat zlepšovat", "Help us improve")}
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-secondary" onClick={() => decide(false)}>
                {t("Jen nezbytné", "Essentials only")}
              </button>
              <button className="btn-secondary" onClick={() => setCustomising(true)}>
                {t("Přizpůsobit", "Customise")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
