// Page titles in the visitor's language (F-17). Route `head()` runs without the language,
// so it keeps the Czech title for the server render; the root component then sets the
// title for the chosen language on every navigation and language switch.

import type { Lang } from "./i18n";

const SUFFIX = " — My Chata";

/** Exact paths first, then prefixes for routes with a parameter. */
const TITLES: Array<[path: string, cs: string, en: string, prefix?: true]> = [
  ["/", "My Chata — správa sdílené chaty", "My Chata — managing a shared cottage"],
  ["/auth", "Přihlášení", "Sign in"],
  ["/onboarding", "Nastavení chaty", "Cottage setup"],
  ["/reset-password", "Obnovení hesla", "Reset password"],
  ["/domu", "Domů", "Home"],
  ["/kalendar", "Kalendář", "Calendar"],
  ["/ukoly", "Údržba", "Maintenance"],
  ["/upozorneni", "Upozornění", "Notifications"],
  ["/vydaje/vyrovnani", "Vyrovnání", "Settlement"],
  ["/vydaje", "Výdaje", "Expenses"],
  ["/predani", "Odjezdové úkoly", "Checkout tasks"],
  ["/manual", "Manuál chaty", "House manual"],
  ["/dokumenty", "Dokumenty", "Document vault"],
  ["/fotky", "Fotky", "Photos"],
  ["/clenove", "Členové", "Members"],
  ["/vice", "Nastavení", "Settings"],
  ["/profil", "Můj profil", "My profile"],
  ["/chaty", "Spravovat chaty", "Manage cottages"],
  ["/chata/nova", "Přidat chatu", "Add cottage"],
  ["/schvalovani", "Ke schválení", "Approvals"],
  ["/zadosti", "Žádosti", "Requests"],
  ["/export", "Export využití", "Usage export"],
  ["/rezervace/nova", "Nová rezervace", "New booking"],
  ["/soukromi", "Soukromí a cookies", "Privacy & cookies"],
  ["/rezervace/", "Detail pobytu", "Stay details", true],
  ["/ukoly/", "Detail úkolu", "Task details", true],
  ["/pozvanka/", "Pozvánka do chaty", "Cottage invitation", true],
  ["/host/", "Pobyt pro hosty", "Guest stay", true],
  ["/verejne/kalendar/", "Kalendář chaty", "Cottage calendar", true],
  ["/verejne/manual/", "Manuál chaty", "Cottage manual", true],
  ["/verejne/zadost/", "Žádost o pobyt", "Stay request", true],
];

/** The title for `pathname` in `lang`, or null for an unknown path (404 keeps its own). */
export function pageTitle(pathname: string, lang: Lang): string | null {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const hit =
    TITLES.find(([p, , , prefix]) => !prefix && p === path) ??
    TITLES.find(([p, , , prefix]) => prefix && path.startsWith(p));
  if (!hit) return null;
  const [p, cs, en] = hit;
  const name = lang === "en" ? en : cs;
  return p === "/" ? name : name + SUFFIX;
}
