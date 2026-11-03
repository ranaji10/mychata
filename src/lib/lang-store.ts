// Where the chosen language is kept in the browser (read by i18n.tsx and account.tsx, T-057).
export type StoredLang = "cs" | "en";

export const LS_LANG = "mychata.lang";

export function readStoredLang(): StoredLang {
  try {
    return localStorage.getItem(LS_LANG) === "en" ? "en" : "cs";
  } catch {
    return "cs";
  }
}
