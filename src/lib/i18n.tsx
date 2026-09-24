import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Lang = "cs" | "en";

const LS_LANG = "mychata.lang";

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
  /** t("český text", "english text") */
  t: (cs: string, en: string) => string;
}

const LangContext = createContext<LangState | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const v = localStorage.getItem(LS_LANG);
      return v === "en" ? "en" : "cs";
    } catch {
      return "cs";
    }
  });

  const value = useMemo<LangState>(
    () => ({
      lang,
      setLang: (l) => {
        setLangState(l);
        try {
          localStorage.setItem(LS_LANG, l);
          document.documentElement.lang = l;
        } catch {
          /* ignore */
        }
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
  const { lang, setLang } = useLang();
  return (
    <div className={`flex items-center gap-1 rounded-full bg-secondary p-1 ${className}`} role="group" aria-label="Language">
      {(["cs", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`min-h-[36px] min-w-[44px] rounded-full px-3 text-[14px] font-bold ${
            lang === l ? "bg-card text-foreground shadow-sm ring-1 ring-black/5" : "text-muted-foreground"
          }`}
        >
          {l === "cs" ? "CZ" : "EN"}
        </button>
      ))}
    </div>
  );
}
