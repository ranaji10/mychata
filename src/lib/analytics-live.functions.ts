import { createServerFn } from "@tanstack/react-start";
import type { AnalyticsSnapshot, ShareRow } from "@/lib/analytics-snapshot";

// D-28 (T-045): the privacy page's Google Analytics numbers, read live from the GA4 Data API
// instead of a hand-copied snapshot. Needs two hosting secrets (docs/runbooks/analytics.md):
//   GA_PROPERTY_ID            numeric GA4 property id (Admin → Property details)
//   GA_SERVICE_ACCOUNT_JSON   the JSON key of a Google Cloud service account that has the
//                             "Viewer" role on that property, nothing else
// Without them, or when Google fails, this returns null and the page shows the snapshot.
// Aggregated counts only; nothing per person. Cached for six hours per server instance.

const CACHE_MS = 6 * 60 * 60 * 1000;
let cache: { at: number; value: AnalyticsSnapshot | null } | null = null;

type ServiceAccount = { client_email: string; private_key: string };

function b64url(data: ArrayBuffer | Uint8Array | string): string {
  const bytes =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : data instanceof Uint8Array
        ? data
        : new Uint8Array(data);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function accessToken(sa: ServiceAccount): Promise<string> {
  const pem = sa.private_key.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    der,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/analytics.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${b64url(signature)}`,
    }),
  });
  if (!res.ok) throw new Error(`token ${res.status}`);
  return ((await res.json()) as { access_token: string }).access_token;
}

type Report = {
  rows?: { dimensionValues?: { value: string }[]; metricValues: { value: string }[] }[];
};

async function runReport(
  token: string,
  property: string,
  body: Record<string, unknown>,
): Promise<Report> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${property}:runReport`,
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        dateRanges: [{ startDate: "28daysAgo", endDate: "yesterday" }],
        ...body,
      }),
    },
  );
  if (!res.ok) throw new Error(`report ${res.status}`);
  return (await res.json()) as Report;
}

const DEVICE: Record<string, [string, string]> = {
  desktop: ["Počítač", "Computer"],
  mobile: ["Telefon", "Phone"],
  tablet: ["Tablet", "Tablet"],
};
const COUNTRY: Record<string, [string, string]> = {
  Czechia: ["Česko", "Czechia"],
  Slovakia: ["Slovensko", "Slovakia"],
  Germany: ["Německo", "Germany"],
  "United States": ["USA", "USA"],
  India: ["Indie", "India"],
  Austria: ["Rakousko", "Austria"],
  Poland: ["Polsko", "Poland"],
  "United Kingdom": ["Velká Británie", "United Kingdom"],
};

/** Top rows as whole-percent shares; the rest folded into "Other". Exported for tests. */
export function toShares(
  report: Report,
  label: (value: string) => [string, string],
  top = 4,
): ShareRow[] {
  const rows = (report.rows ?? []).map((r) => ({
    value: r.dimensionValues?.[0]?.value ?? "",
    n: Number(r.metricValues[0]?.value ?? 0),
  }));
  const total = rows.reduce((s, r) => s + r.n, 0);
  if (!total) return [];
  rows.sort((a, b) => b.n - a.n);
  const shares: ShareRow[] = rows
    .slice(0, top)
    .map((r) => ({ label: label(r.value), pct: Math.round((r.n / total) * 100) }))
    .filter((r) => r.pct > 0);
  const rest = rows.slice(top).reduce((s, r) => s + r.n, 0);
  if (rest > 0) {
    const pct = Math.round((rest / total) * 100);
    if (pct > 0) shares.push({ label: ["Ostatní", "Other"], pct });
  }
  return shares;
}

const PAGE: Record<string, [string, string]> = {
  "/": ["Úvodní stránka", "Front page"],
  "/auth": ["Přihlášení", "Sign-in"],
  "/domu": ["Domů", "Home"],
  "/kalendar": ["Kalendář", "Calendar"],
  "/rezervace": ["Pobyty", "Stays"],
  "/vydaje": ["Výdaje", "Expenses"],
  "/upozorneni": ["Upozornění", "Notifications"],
  "/vice": ["Nastavení", "Settings"],
  "/profil": ["Můj profil", "My profile"],
  "/clenove": ["Členové", "Members"],
  "/chaty": ["Spravovat chaty", "Manage cottages"],
  "/chata": ["Přidat chatu", "Add a cottage"],
  "/fotky": ["Fotky", "Photos"],
  "/manual": ["Manuál", "Manual"],
  "/dokumenty": ["Dokumenty", "Documents"],
  "/ukoly": ["Údržba", "Maintenance"],
  "/predani": ["Odjezdové úkoly", "Checkout tasks"],
  "/zadosti": ["Žádosti", "Requests"],
  "/schvalovani": ["Ke schválení", "Approvals"],
  "/export": ["Export", "Export"],
  "/pomoc": ["Nápověda", "Help"],
  "/soukromi": ["Soukromí", "Privacy"],
  "/onboarding": ["Založení účtu", "Account set-up"],
  "/reset-password": ["Obnovení hesla", "Reset password"],
  "/verejne": ["Veřejné odkazy", "Public links"],
  "/host": ["Odkaz pro hosty", "Guest link"],
  "/pozvanka": ["Pozvánka", "Invitation"],
};

/** A page's name on the privacy page; anything unnamed is "Other", never its raw path. */
export function pageLabel(path: string): [string, string] {
  return PAGE[path] ?? ["Ostatní", "Other"];
}

/** Rows that end up with the same label (several "Other") become one. Exported for tests. */
export function mergeShares(rows: ShareRow[]): ShareRow[] {
  const merged: ShareRow[] = [];
  for (const row of rows) {
    const same = merged.find((m) => m.label[1] === row.label[1]);
    if (same) same.pct += row.pct;
    else merged.push({ ...row, label: [...row.label] as [string, string] });
  }
  const other = merged.findIndex((m) => m.label[1] === "Other");
  if (other >= 0) merged.push(...merged.splice(other, 1));
  return merged;
}

async function load(): Promise<AnalyticsSnapshot | null> {
  const property = process.env["GA_PROPERTY_ID"];
  const json = process.env["GA_SERVICE_ACCOUNT_JSON"];
  if (!property || !json) return null;
  const sa = JSON.parse(json) as ServiceAccount;
  const token = await accessToken(sa);
  const [totals, devices, countries, browsers, pages] = await Promise.all([
    runReport(token, property, {
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "userEngagementDuration" },
        { name: "engagementRate" },
      ],
    }),
    runReport(token, property, {
      dimensions: [{ name: "deviceCategory" }],
      metrics: [{ name: "activeUsers" }],
    }),
    runReport(token, property, {
      dimensions: [{ name: "country" }],
      metrics: [{ name: "activeUsers" }],
    }),
    runReport(token, property, {
      dimensions: [{ name: "browser" }],
      metrics: [{ name: "activeUsers" }],
    }),
    runReport(token, property, {
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "screenPageViews" }],
    }),
  ]);
  const m = totals.rows?.[0]?.metricValues.map((v) => Number(v.value)) ?? [];
  const [activeUsers = 0, sessions = 0, pageViews = 0, engagementTotal = 0, engagementRate = 0] = m;
  const day = (offset: number) => {
    const d = new Date(Date.now() - offset * 86400000);
    return d.toISOString().slice(0, 10);
  };
  // Signed-in pages carry ids in some paths (e.g. /rezervace/<id>): keep only the first segment.
  const pageRows: Report = {
    rows: Object.entries(
      (pages.rows ?? []).reduce<Record<string, number>>((acc, r) => {
        const path = `/${(r.dimensionValues?.[0]?.value ?? "/").split("/")[1] ?? ""}`;
        acc[path] = (acc[path] ?? 0) + Number(r.metricValues[0]?.value ?? 0);
        return acc;
      }, {}),
    ).map(([value, n]) => ({ dimensionValues: [{ value }], metricValues: [{ value: String(n) }] })),
  };
  return {
    period: { from: day(28), to: day(1) },
    activeUsers,
    sessions,
    pageViews,
    engagementSeconds: activeUsers ? Math.round(engagementTotal / activeUsers) : 0,
    engagedPct: Math.round(engagementRate * 100),
    devices: toShares(devices, (v) => DEVICE[v] ?? [v, v], 3),
    countries: toShares(countries, (v) => COUNTRY[v] ?? [v, v]),
    browsers: toShares(browsers, (v) => [v, v]),
    pages: mergeShares(toShares(pageRows, pageLabel, 6)),
  };
}

export const getLiveAnalytics = createServerFn({ method: "GET" }).handler(
  async (): Promise<AnalyticsSnapshot | null> => {
    if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
    try {
      const value = await load();
      cache = { at: Date.now(), value };
      return value;
    } catch (error) {
      console.error("[analytics-live]", (error as Error).message);
      // Try again in ten minutes, not on every view.
      cache = { at: Date.now() - CACHE_MS + 10 * 60 * 1000, value: null };
      return null;
    }
  },
);
