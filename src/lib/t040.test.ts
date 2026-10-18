// T-040: bugs reported on 18 Oct 2026.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { avatarSource } from "@/lib/account-label";
import type { Booking, Task } from "@/lib/data";
import { groupByAccount, isMissingFunction } from "@/lib/my-cottages";
import { isNetworkFailure, isRepeatable } from "@/lib/network-retry";
import { buildNotifications, type NotificationInput } from "@/lib/notification-list";
import { explainPasswordError, needsCurrentPassword } from "@/lib/password";
import { pickPhotoUrls, previewPathFor } from "@/lib/photos";
import { isCottagePath, isSettingsPath } from "@/lib/settings-nav";

const en = (_cs: string, en: string) => en;
const TODAY = "2026-10-18";

function task(over: Partial<Task>): Task {
  return {
    id: "t1",
    property_id: "p",
    title: "Úkol",
    title_cs: "Úkol",
    title_en: "Task",
    description_cs: null,
    description_en: null,
    source_language: "cs",
    category: "other",
    photo_url: null,
    urgency: "LOW",
    assignee_member_id: null,
    status: "OPEN",
    due_date: null,
    done_note: null,
    created_by: "x",
    created_at: "2026-10-01T10:00:00Z",
    ...over,
  };
}

const base: NotificationInput = {
  today: TODAY,
  myMemberId: "me",
  isAdmin: false,
  isFamily: true,
  hasName: true,
  members: [
    { id: "me", name: "Rajat" },
    { id: "anna", name: "Anna" },
  ],
};

describe("notifications (bug 5)", () => {
  it("is empty when nothing is going on", () => {
    expect(buildNotifications(base)).toEqual([]);
  });

  it("asks for a name when the profile has none (bug 7)", () => {
    expect(buildNotifications({ ...base, hasName: false }).map((n) => n.kind)).toEqual([
      "profile",
    ]);
  });

  it("lists invitations, my tasks, overdue and recently added tasks, and money I owe", () => {
    const items = buildNotifications({
      ...base,
      invitations: [
        {
          token: "tok",
          account_name: "Rodina",
          property_name: "Hawaii cottage",
          invited_by: "Anna",
          created_at: "2026-10-17T09:00:00Z",
        },
      ],
      tasks: [
        task({ id: "mine", assignee_member_id: "me" }),
        task({ id: "late", due_date: "2026-10-10" }),
        task({ id: "new", created_at: "2026-10-16T08:00:00Z" }),
        task({ id: "old", created_at: "2026-09-01T08:00:00Z" }),
        task({ id: "done", status: "DONE", due_date: "2026-10-01" }),
      ],
      expenses: [{ id: "e1", paid_by_member_id: "anna" }],
      splits: [
        {
          id: "s1",
          expense_id: "e1",
          member_id: "me",
          amount_owed: 500,
          paid_back: false,
          paid_back_confirmed_by: null,
        },
        {
          id: "s2",
          expense_id: "e1",
          member_id: "me",
          amount_owed: 250,
          paid_back: true,
          paid_back_confirmed_by: null,
        },
      ],
    });
    const keys = items.map((n) => n.key);
    expect(keys).toContain("invitation:tok");
    expect(keys).toContain("task-mine:mine");
    expect(keys).toContain("task-overdue:late");
    expect(keys).toContain("task-new:new");
    expect(keys).not.toContain("task-new:old");
    expect(keys.some((k) => k.includes("done"))).toBe(false);
    const owe = items.find((n) => n.kind === "owe");
    expect(owe?.title[1]).toBe("You owe Anna 500 Kč");
    expect(items.find((n) => n.kind === "invitation")?.params).toEqual({ token: "tok" });
  });

  it("shows held stays and guest requests to admins only", () => {
    const held: Booking = {
      id: "b1",
      property_id: "p",
      requester_name: "Petr",
      requester_member_id: "x",
      start_date: "2026-11-01",
      end_date: "2026-11-03",
      guests: 2,
      note: null,
      status: "PENDING",
      created_at: "2026-10-17T10:00:00Z",
    };
    const guests = [
      { id: "g1", guest_name: "Host", start_date: "2026-11-05", created_at: "2026-10-17T11:00:00Z" },
    ];
    expect(buildNotifications({ ...base, bookings: [held], guestRequests: guests })).toEqual([]);
    const admin = buildNotifications({
      ...base,
      isAdmin: true,
      bookings: [held],
      guestRequests: guests,
    });
    expect(admin.map((n) => n.kind).sort()).toEqual(["approval", "guest_request"]);
  });

  it("warns about documents expiring within 30 days, newest first overall", () => {
    const items = buildNotifications({
      ...base,
      documents: [
        { id: "d1", title: "Pojistka", expiry_date: "2026-11-01", created_at: "x" },
        { id: "d2", title: "Revize", expiry_date: "2027-06-01", created_at: "x" },
        { id: "d3", title: "Záruka", expiry_date: "2026-10-01", created_at: "x" },
      ],
    });
    expect(items.map((n) => n.key)).toEqual(["doc:d1:2026-11-01", "doc:d3:2026-10-01"]);
    expect(items[1]?.tone).toBe("warn");
  });
});

describe("Settings and its pages (bugs 4, 10)", () => {
  it("keeps the Settings tab lit on every nested page", () => {
    for (const p of ["/vice", "/profil", "/clenove", "/chaty", "/fotky", "/manual", "/dokumenty"])
      expect(isSettingsPath(p)).toBe(true);
    expect(isSettingsPath("/ukoly")).toBe(true);
    expect(isSettingsPath("/ukoly/abc")).toBe(true);
    expect(isSettingsPath("/domu")).toBe(false);
    expect(isSettingsPath("/kalendar")).toBe(false);
    expect(isSettingsPath("/upozorneni")).toBe(false);
    expect(isSettingsPath("/vydaje")).toBe(false);
  });

  it("knows which pages belong to the open cottage", () => {
    expect(isCottagePath("/fotky")).toBe(true);
    expect(isCottagePath("/ukoly/1")).toBe(true);
    expect(isCottagePath("/profil")).toBe(false);
  });
});

describe("saves on a dropped connection (bug 3)", () => {
  const url = "https://x.supabase.co";
  it("retries reads and value-setting calls, never an insert", () => {
    expect(isRepeatable("GET", `${url}/rest/v1/tasks`)).toBe(true);
    expect(isRepeatable("PATCH", `${url}/rest/v1/tasks?id=eq.1`)).toBe(true);
    expect(isRepeatable("POST", `${url}/rest/v1/rpc/update_property_details`)).toBe(true);
    expect(isRepeatable("POST", `${url}/rest/v1/manual_sections`)).toBe(false);
    expect(isRepeatable("POST", `${url}/rest/v1/rpc/settle_debt`)).toBe(false);
    expect(isRepeatable("POST", `${url}/storage/v1/object/sign/my-chata-files`)).toBe(true);
  });

  it("recognises Safari's and Chrome's network failures only", () => {
    expect(isNetworkFailure(new TypeError("Load failed"))).toBe(true);
    expect(isNetworkFailure(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkFailure(new Error("Load failed"))).toBe(false);
    expect(isNetworkFailure(new TypeError("x is undefined"))).toBe(false);
  });
});

describe("password change while signed in (bug 15)", () => {
  it("spots Supabase's current-password answers and explains them", () => {
    expect(
      needsCurrentPassword({ message: "Current password required when setting new password." }),
    ).toBe(true);
    expect(needsCurrentPassword({ code: "current_password_mismatch", message: "x" })).toBe(true);
    expect(needsCurrentPassword({ message: "Password should be at least 8 characters" })).toBe(
      false,
    );
    expect(
      explainPasswordError("Current password required when setting new password.", en),
    ).toBe("To change your password, also enter your current password.");
  });
});

describe("photos (bug 13)", () => {
  it("stores the preview next to the photo", () => {
    expect(previewPathFor("p1/photos/abc-img.jpg")).toBe("p1/photos/preview/abc-img.jpg");
  });

  it("uses the preview when it exists and the full photo otherwise", () => {
    const photos = [
      { id: "new", storage_path: "p/photos/a.jpg" },
      { id: "old", storage_path: "p/photos/b.jpg" },
    ];
    const urls = pickPhotoUrls(photos, [
      { path: "p/photos/preview/a.jpg", signedUrl: "A-small", error: null },
      { path: "p/photos/a.jpg", signedUrl: "A-full", error: null },
      { path: "p/photos/preview/b.jpg", signedUrl: null, error: "Object not found" },
      { path: "p/photos/b.jpg", signedUrl: "B-full", error: null },
    ]);
    expect(urls).toEqual({ new: "A-small", old: "B-full" });
  });
});

describe("switcher and profile (bugs 9, 14a, 16)", () => {
  it("groups cottages by account", () => {
    const grouped = groupByAccount([
      { account_id: "a", property_id: "1", name: "Alfa", city: null },
      { account_id: "a", property_id: "2", name: "Beta", city: null },
      { account_id: "b", property_id: "3", name: "Inst", city: "Praha" },
    ]);
    expect(Object.keys(grouped)).toEqual(["a", "b"]);
    expect(grouped["a"]?.map((c) => c.name)).toEqual(["Alfa", "Beta"]);
  });

  it("treats a missing database function as 'not yet', not as an error", () => {
    expect(isMissingFunction({ code: "PGRST202", message: "x" })).toBe(true);
    expect(isMissingFunction({ code: "42501", message: "permission denied" })).toBe(false);
  });

  it("shows the person's own photo first, then Google's", () => {
    expect(avatarSource({ avatar_url: "own" }, { user_metadata: { avatar_url: "g" } })).toBe("own");
    expect(avatarSource({ avatar_url: null }, { user_metadata: { picture: "g" } })).toBe("g");
    expect(avatarSource(null, { user_metadata: {} })).toBeNull();
  });
});

describe("one look for list rows (bug 6)", () => {
  // A <Button> is pill-shaped by default. Used as a full-width row in a divided list it drew
  // curved lines at the dividers. List rows must say rounded-none (or use SettingsRow).
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory()
        ? files(path)
        : path.endsWith(".tsx")
          ? [path]
          : [];
    });
  }
  it("no full-width row button keeps the pill shape", () => {
    const offenders: string[] = [];
    for (const file of files("src")) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/<Button\b[^>]*?className=(?:"([^"]*)"|\{`([^`]*)`\})/gs)) {
        const cls = m[1] ?? m[2] ?? "";
        const isRow = /min-h-\[60px\]/.test(cls) && /\bw-full\b/.test(cls);
        if (isRow && !/rounded-none|rounded-\[|rounded-2xl|rounded-xl|btn-|card/.test(cls))
          offenders.push(`${file}: ${cls.slice(0, 80)}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
