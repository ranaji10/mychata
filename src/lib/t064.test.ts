// T-064: O-26 (a message about a stay opens it), O-27 (requests whose dates passed undecided)
// and O-29 (English says "cottage", never "chata", except in the brand name MyChata).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isUndecided } from "@/lib/data";
import { renderNotificationEmail } from "@/lib/notification-email";
import { storedItem } from "@/lib/notification-list";

describe("O-26: message to the admins", () => {
  const stored = (payload: Record<string, unknown>) => ({
    id: "n1",
    kind: "message_to_admin",
    payload,
    created_at: "2026-11-06T10:00:00Z",
    read_at: null,
  });

  it("opens the stay it was sent from", () => {
    const item = storedItem(stored({ from_name: "Petr", body: "Prosím", booking_id: "b-42" }));
    expect(item!.notification.to).toBe("/rezervace/$id");
    expect(item!.notification.params).toEqual({ id: "b-42" });
  });

  it("an older message without a stay stays on Notifications", () => {
    const item = storedItem(stored({ from_name: "Petr", body: "Prosím" }));
    expect(item!.notification.to).toBe("/upozorneni");
    expect(item!.notification.params).toBeUndefined();
  });

  it("the e-mail links to the stay when there is one", () => {
    const withStay = renderNotificationEmail({
      id: "n1",
      kind: "message_to_admin",
      payload: { from_name: "Petr", account_name: "Rodina A", body: "Prosím", booking_id: "b-42" },
    })!;
    expect(withStay.url).toMatch(/\/rezervace\/b-42$/);
    expect(withStay.button[1]).toBe("View the stay");
    const without = renderNotificationEmail({
      id: "n1",
      kind: "message_to_admin",
      payload: { from_name: "Petr", account_name: "Rodina A", body: "Prosím" },
    })!;
    expect(without.url).toMatch(/\/upozorneni$/);
  });
});

describe("O-27: undecided requests", () => {
  const today = "2026-11-06";
  it("a pending request is undecided once its departure day has passed", () => {
    expect(isUndecided({ status: "PENDING", end_date: "2026-11-01" }, today)).toBe(true);
    expect(isUndecided({ status: "PENDING", end_date: "2026-11-05" }, today)).toBe(true);
  });
  it("still waiting while the stay runs or is ahead; confirmed stays never", () => {
    expect(isUndecided({ status: "PENDING", end_date: today }, today)).toBe(false);
    expect(isUndecided({ status: "PENDING", end_date: "2026-12-01" }, today)).toBe(false);
    expect(isUndecided({ status: "CONFIRMED", end_date: "2026-11-01" }, today)).toBe(false);
  });
  it("the calendar draws it grey with its own legend entry, and the stay detail has no Approve", () => {
    const cal = readFileSync("src/components/calendar.tsx", "utf8");
    expect(cal).toContain('t("Nerozhodnuto", "Not decided")');
    const detail = readFileSync("src/routes/rezervace.$id.tsx", "utf8");
    expect(detail).toMatch(/\{!undecided && \(\s*<Button[\s\S]*?"Approve"/);
  });
});

describe("O-29: English says cottage", () => {
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return name === "integrations" ? [] : files(path);
      return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
    });
  }
  // The English half of every t("…", "…") call, string or template literal.
  const pair = /\bt\(\s*(["`])(?:\\.|(?!\1)[\s\S])*\1\s*,\s*(["`])((?:\\.|(?!\2)[\s\S])*)\2/g;

  it('no English text in the app says "chata"', () => {
    const offenders: string[] = [];
    for (const file of files("src")) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(pair)) {
        const english = m[3]!.replace(/MyChata/g, "");
        if (/\bchatas?\b/i.test(english)) offenders.push(`${file}: ${m[3]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the regex sees the English half (self-check)", () => {
    const sample = 't("Přidat chatu", "Add a chata")';
    expect([...sample.matchAll(pair)][0]![3]).toBe("Add a chata");
  });
});

describe("O-27: guest requests whose dates passed (PR #108 review)", () => {
  it("Notifications no longer asks to decide them", async () => {
    const { buildNotifications } = await import("@/lib/notification-list");
    const base = { today: "2026-11-06", isAdmin: true } as Parameters<typeof buildNotifications>[0];
    const g = (id: string, end_date: string) => ({
      id,
      guest_name: "Host",
      start_date: "2026-10-26",
      end_date,
      created_at: "2026-10-20T10:00:00Z",
      source: "public_calendar",
    });
    const keys = buildNotifications({
      ...base,
      guestRequests: [g("old", "2026-11-01"), g("now", "2026-11-08")],
    }).map((n) => n.key);
    expect(keys).toContain("guest:now");
    expect(keys).not.toContain("guest:old");
  });

  it("Requests offers only Decline for them; share pages keep their colours", () => {
    // T-069: public requests moved from Home to Requests (src/components/PublicRequests.tsx).
    const home = readFileSync("src/components/PublicRequests.tsx", "utf8");
    expect(home).toContain("const undecided = g.end_date < today;");
    expect(home).toMatch(/\{!undecided && \(\s*<Button[\s\S]*?"Confirm stay"/);
    for (const page of ["src/routes/verejne.kalendar.$token.tsx", "src/routes/host.$token.tsx"]) {
      expect(readFileSync(page, "utf8")).not.toContain("greyUndecided");
    }
    expect(readFileSync("src/routes/kalendar.tsx", "utf8")).toContain("greyUndecided");
  });
});
