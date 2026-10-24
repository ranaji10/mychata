// T-043: requests of 25 Oct 2026 (tab order, public calendar booking requests, analytics,
// cookie banner, security headers).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ANALYTICS_SNAPSHOT, formatDuration } from "@/lib/analytics-snapshot";
import { buildNotifications, type NotificationInput } from "@/lib/notification-list";
import {
  calendarFromMetadata,
  clearPendingCalendar,
  pendingCalendar,
  publicRequestMessage,
  savePendingCalendar,
} from "@/lib/pending-booking";
import { withSecurityHeaders } from "../server";

const src = (path: string) => readFileSync(join(__dirname, "..", "..", path), "utf8");

describe("tab bar order", () => {
  it("is Home, Expenses, Calendar, Notifications, Settings for families", () => {
    const shell = src("src/components/AppShell.tsx");
    const family = shell.slice(
      shell.indexOf("const FAMILY_TABS"),
      shell.indexOf("const INST_TABS"),
    );
    const order = [...family.matchAll(/to: "(\/[a-z]+)"/g)].map((m) => m[1]);
    expect(order).toEqual(["/domu", "/vydaje", "/kalendar", "/upozorneni", "/vice"]);
  });
  it("keeps Requests in Expenses' place for institutions", () => {
    const shell = src("src/components/AppShell.tsx");
    const inst = shell.slice(shell.indexOf("const INST_TABS"), shell.indexOf("const tabs ="));
    const order = [...inst.matchAll(/to: "(\/[a-z]+)"/g)].map((m) => m[1]);
    expect(order).toEqual(["/domu", "/zadosti", "/kalendar", "/upozorneni", "/vice"]);
  });
});

describe("returning to the public calendar after sign-up", () => {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: Storage }).localStorage ??= {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
  afterEach(() => clearPendingCalendar());

  it("keeps the token for a day, then forgets it", () => {
    savePendingCalendar("tok-abcdef12");
    expect(pendingCalendar()).toBe("tok-abcdef12");
    expect(pendingCalendar(Date.now() + 25 * 3600 * 1000)).toBeNull();
    expect(pendingCalendar()).toBeNull();
  });

  it("uses the sign-up metadata only for an account made in the last two days", () => {
    const now = Date.parse("2026-10-25T12:00:00Z");
    const meta = { return_calendar: "tok-abcdef12" };
    expect(calendarFromMetadata(meta, "2026-10-24T12:00:00Z", now)).toBe("tok-abcdef12");
    expect(calendarFromMetadata(meta, "2026-10-20T12:00:00Z", now)).toBeNull();
    expect(calendarFromMetadata({}, "2026-10-24T12:00:00Z", now)).toBeNull();
    expect(calendarFromMetadata({ return_calendar: 5 }, "2026-10-24T12:00:00Z", now)).toBeNull();
    expect(calendarFromMetadata(meta, null, now)).toBeNull();
  });

  it("explains every answer of request_public_booking in both languages", () => {
    for (const r of [
      "ok",
      "sign_in",
      "link",
      "unconfirmed",
      "member",
      "dates",
      "guests",
      "busy",
      "rate",
      "duplicate",
    ]) {
      const [cs, en] = publicRequestMessage(r);
      expect(cs.length).toBeGreaterThan(5);
      expect(en.length).toBeGreaterThan(5);
    }
    expect(publicRequestMessage("weird")).toEqual(publicRequestMessage("link"));
  });
});

describe("notifications say who decided a request", () => {
  const base: NotificationInput = {
    today: "2026-10-25",
    myMemberId: "a1",
    isAdmin: true,
    isFamily: true,
    hasName: true,
    members: [{ id: "a1", name: "Anna" }],
  };
  it("marks public-calendar requests and names the approver", () => {
    const items = buildNotifications({
      ...base,
      guestRequests: [
        {
          id: "g1",
          guest_name: "Host",
          start_date: "2026-11-01",
          created_at: "2026-10-24T10:00:00Z",
          source: "public_calendar",
        },
      ],
      decidedGuestRequests: [
        {
          id: "g2",
          guest_name: "Jana",
          start_date: "2026-11-05",
          status: "APPROVED",
          decided_at: "2026-10-24T11:00:00Z",
          decided_by_member_id: "a1",
        },
        {
          id: "g3",
          guest_name: "Karel",
          start_date: "2026-11-07",
          status: "DECLINED",
          decided_at: "2026-10-24T12:00:00Z",
          decided_by_member_id: "gone",
        },
      ],
    });
    const titles = items.map((n) => n.title[0]);
    expect(titles).toContain("Žádost z veřejného kalendáře: Host");
    expect(titles).toContain("Anna schválil(a) žádost: Jana");
    expect(titles).toContain("správce zamítl(a) žádost: Karel");
  });
});

describe("analytics snapshot on the privacy page", () => {
  it("has whole-percent shares that add up to about 100", () => {
    for (const rows of [
      ANALYTICS_SNAPSHOT.devices,
      ANALYTICS_SNAPSHOT.countries,
      ANALYTICS_SNAPSHOT.browsers,
    ]) {
      const total = rows.reduce((sum, r) => sum + r.pct, 0);
      expect(total).toBeGreaterThanOrEqual(98);
      expect(total).toBeLessThanOrEqual(102);
      for (const r of rows) expect(Number.isInteger(r.pct)).toBe(true);
    }
    expect(ANALYTICS_SNAPSHOT.period.from < ANALYTICS_SNAPSHOT.period.to).toBe(true);
  });
  it("formats durations", () => {
    expect(formatDuration(270)).toBe("4 min 30 s");
    expect(formatDuration(42)).toBe("42 s");
  });
  it("never sends question text or ids to Google", () => {
    const ask = src("src/components/AskBox.tsx");
    expect(ask).toMatch(/track\("manual_question", \{ result:/);
    expect(ask).not.toMatch(/track\([^)]*question: q/);
  });
  it("runs the gtag bootstrap only once per page", () => {
    expect(src("src/routes/__root.tsx")).toContain(
      "if(!window.__mcGtagBoot){window.__mcGtagBoot=1;",
    );
  });
});

describe("security headers (F-06)", () => {
  it("adds the safe headers everywhere and framing rules only on mychata.cz", async () => {
    const prod = withSecurityHeaders(new Response("x", { status: 200 }), "mychata.cz");
    expect(prod.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(prod.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(prod.headers.get("Content-Security-Policy")).toContain("frame-ancestors 'self'");
    expect(await prod.text()).toBe("x");
    const preview = withSecurityHeaders(new Response("x"), "abc.lovableproject.com");
    expect(preview.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(preview.headers.get("X-Frame-Options")).toBeNull();
  });
  it("keeps a header the app already set", () => {
    const r = withSecurityHeaders(
      new Response("x", { headers: { "Referrer-Policy": "no-referrer" } }),
      "mychata.cz",
    );
    expect(r.headers.get("Referrer-Policy")).toBe("no-referrer");
  });
});
