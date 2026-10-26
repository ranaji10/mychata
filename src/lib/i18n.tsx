import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type Lang = "cs" | "en";

const LS_LANG = "mychata.lang";

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** t("český text", "english text") */
  t: (cs: string, en: string) => string;
}

const LangContext = createContext<LangState | null>(null);

// The chosen language lives in localStorage, which the server can't see: it always renders
// Czech. Reading localStorage in the first client render made every page of an English user
// differ from the server's HTML (React error #418), so React threw the server render away on
// each load (F-29, 26 Oct). useSyncExternalStore hydrates with the server's "cs" and switches
// to the stored language straight after, without the error.
const langListeners = new Set<() => void>();

function readStoredLang(): Lang {
  try {
    return localStorage.getItem(LS_LANG) === "en" ? "en" : "cs";
  } catch {
    return "cs";
  }
}

function subscribeLang(onChange: () => void) {
  langListeners.add(onChange);
  // Another tab switched the language: follow it.
  const onStorage = (e: StorageEvent) => {
    if (e.key === LS_LANG) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    langListeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** What the server renders, and so what hydration starts from. */
export const SERVER_LANG: Lang = "cs";

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Only used where localStorage throws (private mode), so the choice still holds on this page.
  const [memoryLang, setMemoryLang] = useState<Lang | null>(null);
  const storedLang = useSyncExternalStore(subscribeLang, readStoredLang, () => SERVER_LANG);
  const lang = memoryLang ?? storedLang;

  // The page says which language it is in, also after a reload in English; with "cs" on an
  // English page, browsers offered to translate it from Czech (bug 3 of 18 Oct).
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LangState>(
    () => ({
      lang,
      setLang: (l) => {
        track("language_change", { app_language: l });
        try {
          localStorage.setItem(LS_LANG, l);
          setMemoryLang(null);
        } catch {
          setMemoryLang(l);
        }
        document.documentElement.lang = l;
        langListeners.forEach((notify) => notify());
      },
      t: (cs, en) => (lang === "en" ? en : cs),
    }),
    [lang],
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangState {
  const ctx = useContext(LangContext);
  if (!ctx) return { lang: "cs", setLang: () => {}, t: (cs) => cs };
  return ctx;
}

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useLang();
  return (
    <div
      className={`flex items-center gap-0.5 rounded-full bg-card p-1 ${className}`}
      role="group"
      aria-label={t("Jazyk", "Language")}
    >
      {(["cs", "en"] as const).map((l) => (
        <Button
          variant="fresh"
          size="fresh"
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`min-h-11 min-w-11 rounded-full px-3 text-[14px] font-bold ${
            lang === l ? "bg-foreground text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          {l === "cs" ? "CZ" : "EN"}
        </Button>
      ))}
    </div>
  );
}
