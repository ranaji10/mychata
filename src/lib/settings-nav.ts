// Settings and its nested pages (bugs 4, 4a, 4b, 4c and 10 of 18 Oct 2026).
// One list, used by the Settings page, the desktop sidebar and the tab highlight, so a page
// added under Settings shows up in all three.
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Camera,
  ClipboardCheck,
  FileText,
  Home,
  LifeBuoy,
  Shield,
  User,
  Users,
  Wrench,
} from "lucide-react";

export interface SettingsLink {
  to: string;
  label: [cs: string, en: string];
  icon: LucideIcon;
  /** Pages for the open cottage, shown under Manage cottages. */
  children?: SettingsLink[];
}

/** The open cottage's own pages: Manage cottages is their summary hub (bug 4c). */
export const COTTAGE_PAGES: SettingsLink[] = [
  { to: "/fotky", label: ["Fotky", "Photos"], icon: Camera },
  { to: "/manual", label: ["Manuál", "Manual"], icon: BookOpen },
  { to: "/dokumenty", label: ["Dokumenty", "Documents"], icon: FileText },
  { to: "/ukoly", label: ["Údržba", "Maintenance"], icon: Wrench },
];

export const SETTINGS_LINKS: SettingsLink[] = [
  { to: "/profil", label: ["Můj profil", "My profile"], icon: User },
  { to: "/clenove", label: ["Členové a oprávnění", "Members & permissions"], icon: Users },
  {
    to: "/chaty",
    label: ["Spravovat chaty", "Manage cottages"],
    icon: Home,
    children: COTTAGE_PAGES,
  },
  { to: "/predani", label: ["Odjezdové úkoly", "Checkout Tasks"], icon: ClipboardCheck },
  { to: "/pomoc", label: ["Nápověda a podpora", "Help & support"], icon: LifeBuoy },
  { to: "/soukromi", label: ["Soukromí a cookies", "Privacy & cookies"], icon: Shield },
];

const EXTRA_SETTINGS_PATHS = ["/vice", "/chata/nova", "/export"];

/** True for Settings and every page reached from it, so the Settings tab stays lit (bug 10). */
export function isSettingsPath(pathname: string): boolean {
  const all = [
    ...EXTRA_SETTINGS_PATHS,
    ...SETTINGS_LINKS.flatMap((l) => [l.to, ...(l.children ?? []).map((c) => c.to)]),
  ];
  return all.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** True for Manage cottages and the open cottage's own pages. */
export function isCottagePath(pathname: string): boolean {
  return ["/chaty", ...COTTAGE_PAGES.map((c) => c.to)].some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}
