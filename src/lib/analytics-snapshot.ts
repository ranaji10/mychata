// What Google Analytics shows the maintainers, copied by hand from the GA4 property for
// mychata.cz (T-043). Aggregated counts only: no names, emails, cottages or anything a member
// wrote. The privacy page draws it so visitors see the data the way we see it.
//
// Refresh: GA4 → Reports, "Last 28 days" (Users, Tech details, Demographic details, Pages and
// screens). Update the numbers and `period`; keep shares as whole percentages. Runbook:
// docs/runbooks/analytics.md.

export interface ShareRow {
  /** Czech and English label. */
  label: [cs: string, en: string];
  /** Whole percent of active users (or of views, for pages). */
  pct: number;
}

export interface AnalyticsSnapshot {
  period: { from: string; to: string };
  activeUsers: number;
  sessions: number;
  pageViews: number;
  /** Average engagement time per active user, in seconds. */
  engagementSeconds: number;
  /** Share of sessions longer than 10 s or with 2+ pages. */
  engagedPct: number;
  devices: ShareRow[];
  countries: ShareRow[];
  browsers: ShareRow[];
  /** Most viewed screens, as a share of all page views. */
  pages: ShareRow[];
}

export const ANALYTICS_SNAPSHOT: AnalyticsSnapshot = {
  period: { from: "2026-09-27", to: "2026-10-24" },
  activeUsers: 44,
  sessions: 92,
  pageViews: 1299,
  engagementSeconds: 270,
  engagedPct: 83,
  devices: [
    { label: ["Počítač", "Computer"], pct: 82 },
    { label: ["Telefon", "Phone"], pct: 18 },
  ],
  countries: [
    {
      label: [
        "USA (z velké části naše automatické kontroly webu)",
        "USA (largely our own automated site checks)",
      ],
      pct: 43,
    },
    { label: ["Česko", "Czechia"], pct: 32 },
    { label: ["Saúdská Arábie", "Saudi Arabia"], pct: 14 },
    { label: ["Indie", "India"], pct: 7 },
    { label: ["Ostatní", "Other"], pct: 5 },
  ],
  browsers: [
    { label: ["Chrome", "Chrome"], pct: 89 },
    { label: ["Firefox", "Firefox"], pct: 5 },
    { label: ["Safari", "Safari"], pct: 5 },
    { label: ["Edge", "Edge"], pct: 2 },
  ],
  pages: [
    { label: ["Domů", "Home"], pct: 21 },
    { label: ["Nastavení", "Settings"], pct: 20 },
    { label: ["Přihlášení", "Sign-in"], pct: 11 },
    { label: ["Kalendář", "Calendar"], pct: 7 },
    { label: ["Můj profil", "My profile"], pct: 6 },
  ],
};

/** "4 min 30 s" / "4 min 30 s". */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return m > 0 ? `${m} min ${s} s` : `${s} s`;
}
