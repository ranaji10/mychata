// Notifications (bug 5, 18 Oct 2026): one place for "what happened and what needs me".
//
// Built from data the app already reads, so nothing new has to be stored yet. Each source adds
// items through `buildNotifications`; a new feature (bills, messages, emails) adds a field to
// NotificationInput and a block below, and the page, the badge and the tests pick it up.
import { fmtDate } from "@/lib/data";
import type { Booking, ExpenseSplit, InstitutionalRequest, Member, Task } from "@/lib/data";

export type NotificationKind =
  | "invitation"
  | "ownership_offer"
  | "approval"
  | "auto_approved"
  | "guest_request"
  | "institution_request"
  | "task_assigned"
  | "task_overdue"
  | "task_new"
  | "owe"
  | "document_expiry"
  | "profile";

export type NotificationTone = "action" | "warn" | "info";

export interface AppNotification {
  /** Stable across reloads, so "new since last visit" can be worked out. */
  key: string;
  kind: NotificationKind;
  tone: NotificationTone;
  /** ISO date or timestamp the item belongs to; newest first. */
  at: string;
  /** Short words in both languages, picked by the page. */
  title: [cs: string, en: string];
  detail?: [cs: string, en: string] | undefined;
  /** Where tapping goes. */
  to: string;
  params?: Record<string, string> | undefined;
}

export interface PendingInvitation {
  token: string;
  account_name: string;
  property_name: string | null;
  invited_by: string | null;
  created_at: string;
}

export interface DocumentLite {
  id: string;
  title: string;
  expiry_date: string | null;
  created_at: string;
}

export interface NotificationInput {
  today: string;
  /** Items newer than this many days count as "new" for added tasks. */
  recentDays?: number;
  myMemberId: string | null;
  isAdmin: boolean;
  isFamily: boolean;
  hasName: boolean;
  /** Family accounts the person runs that are named like one of their cottages (T-042). */
  accountsToRename?: { id: string; name: string }[] | undefined;
  members: Pick<Member, "id" | "name">[];
  /** The open cottage, for "4 bookings were confirmed automatically for …" (T-042). */
  propertyName?: string | undefined;
  invitations?: PendingInvitation[] | null | undefined;
  /** Someone wants to hand the person an account (25 Oct 2026); accepted in Members. */
  ownershipOffers?:
    | { id: string; account_name: string; from_name: string; created_at: string }[]
    | null
    | undefined;
  bookings?: Booking[] | null | undefined;
  guestRequests?:
    | { id: string; guest_name: string; start_date: string; created_at: string; source?: string }[]
    | null
    | undefined;
  /** Booking requests decided in the last two weeks, with who decided (T-043). */
  decidedGuestRequests?:
    | {
        id: string;
        guest_name: string;
        start_date: string;
        status: string;
        decided_at: string | null;
        decided_by_member_id: string | null;
      }[]
    | null
    | undefined;
  requests?: InstitutionalRequest[] | null | undefined;
  tasks?: Task[] | null | undefined;
  splits?: ExpenseSplit[] | null | undefined;
  expenses?: { id: string; paid_by_member_id: string | null }[] | null | undefined;
  documents?: DocumentLite[] | null | undefined;
}

function daysBetween(a: string, b: string) {
  return Math.round(
    (new Date(`${b.slice(0, 10)}T00:00:00`).getTime() -
      new Date(`${a.slice(0, 10)}T00:00:00`).getTime()) /
      86400000,
  );
}

/** The local calendar day of a timestamp (created_at is UTC). */
function localDay(ts: string) {
  if (ts.length <= 10) return ts;
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** "4 pobyty byly automaticky potvrzeny", "5 pobytů bylo automaticky potvrzeno". */
const czBookings = (n: number) =>
  n >= 2 && n <= 4
    ? `${n} pobyty byly automaticky potvrzeny`
    : `${n} pobytů bylo automaticky potvrzeno`;

const kc = (n: number) => `${Math.round(n).toLocaleString("cs-CZ")} Kč`;

/** Pure: turns what the app has read into a list, newest first. Tested in t040.test.ts. */
export function buildNotifications(input: NotificationInput): AppNotification[] {
  const out: AppNotification[] = [];
  const recent = input.recentDays ?? 7;
  const nameOf = (id: string | null) => input.members.find((m) => m.id === id)?.name ?? "";

  if (!input.hasName) {
    out.push({
      key: "profile:name",
      kind: "profile",
      tone: "action",
      at: input.today,
      title: ["Doplňte své jméno", "Add your name"],
      detail: [
        "Ostatní pak uvidí, kdo jste, místo e-mailu.",
        "Others will then see who you are instead of an email.",
      ],
      to: "/profil",
    });
  }

  for (const a of input.accountsToRename ?? []) {
    out.push({
      key: `profile:rename:${a.id}:${a.name}`,
      kind: "profile",
      tone: "action",
      at: input.today,
      title: [`Přejmenujte účet „${a.name}“`, `Rename the account "${a.name}"`],
      detail: [
        "Jmenuje se stejně jako chata. Změníte to v Mém profilu.",
        "It has the same name as a cottage. Change it in My profile.",
      ],
      to: "/profil",
    });
  }

  for (const o of input.ownershipOffers ?? []) {
    out.push({
      key: `ownership_offer:${o.id}`,
      kind: "ownership_offer",
      tone: "action",
      at: o.created_at,
      title: [
        `${o.from_name} vám předává účet „${o.account_name}“`,
        `${o.from_name} is handing you “${o.account_name}”`,
      ],
      detail: [
        "Přijměte nebo odmítněte v Členech a oprávněních.",
        "Accept or decline in Members & permissions.",
      ],
      to: "/clenove",
    });
  }

  for (const inv of input.invitations ?? []) {
    const where = inv.property_name ?? inv.account_name;
    out.push({
      key: `invitation:${inv.token}`,
      kind: "invitation",
      tone: "action",
      at: inv.created_at,
      title: [`Pozvánka do: ${where}`, `Invitation to ${where}`],
      detail: inv.invited_by
        ? [`Zve vás ${inv.invited_by}.`, `From ${inv.invited_by}.`]
        : ["Klepněte a přijměte ji.", "Tap to accept it."],
      to: "/pozvanka/$token",
      params: { token: inv.token },
    });
  }

  if (input.isAdmin) {
    for (const b of input.bookings ?? []) {
      if (b.status !== "PENDING" || b.end_date < input.today) continue;
      out.push({
        key: `approval:${b.id}`,
        kind: "approval",
        tone: "action",
        at: b.created_at,
        title: [`Pobyt ke schválení: ${b.requester_name}`, `Stay to approve: ${b.requester_name}`],
        detail: [
          `${fmtDate(b.start_date)} – ${fmtDate(b.end_date)}`,
          `${fmtDate(b.start_date)} – ${fmtDate(b.end_date)}`,
        ],
        to: "/rezervace/$id",
        params: { id: b.id },
      });
    }
    // Bookings confirmed without anyone deciding (T-042), one item per day they were made:
    // "4 bookings were confirmed automatically for Chata Alfa". The admin's own are left out.
    const autoByDay = new Map<string, Booking[]>();
    for (const b of input.bookings ?? []) {
      if (!b.auto_approved || b.status !== "CONFIRMED") continue;
      if (input.myMemberId && b.requester_member_id === input.myMemberId) continue;
      const day = localDay(b.created_at);
      if (daysBetween(day, input.today) > recent) continue;
      autoByDay.set(day, [...(autoByDay.get(day) ?? []), b]);
    }
    const where = input.propertyName ?? "";
    for (const [day, list] of autoByDay) {
      const one = list.length === 1 ? list[0]! : null;
      const names = [...new Set(list.map((b) => b.requester_name).filter(Boolean))].join(", ");
      const latest = list.reduce((a, b) => (a.created_at > b.created_at ? a : b)).created_at;
      out.push({
        key: `auto:${day}:${list.length}`,
        kind: "auto_approved",
        tone: "info",
        at: latest,
        title: one
          ? [
              `Pobyt automaticky potvrzen: ${one.requester_name}${where ? ` (${where})` : ""}`,
              `Booking confirmed automatically: ${one.requester_name}${where ? ` (${where})` : ""}`,
            ]
          : [
              `${czBookings(list.length)}${where ? ` pro ${where}` : ""}`,
              `${list.length} bookings were confirmed automatically${where ? ` for ${where}` : ""}`,
            ],
        detail: one
          ? [
              `${fmtDate(one.start_date)} – ${fmtDate(one.end_date)}`,
              `${fmtDate(one.start_date)} – ${fmtDate(one.end_date)}`,
            ]
          : [`${fmtDate(day)} · ${names}`, `${fmtDate(day)} · ${names}`],
        to: one ? "/rezervace/$id" : "/kalendar",
        params: one ? { id: one.id } : undefined,
      });
    }
    for (const g of input.guestRequests ?? []) {
      out.push({
        key: `guest:${g.id}`,
        kind: "guest_request",
        tone: "action",
        at: g.created_at,
        title:
          g.source === "public_calendar"
            ? [
                `Žádost z veřejného kalendáře: ${g.guest_name}`,
                `Request from the public calendar: ${g.guest_name}`,
              ]
            : [`Žádost hosta: ${g.guest_name}`, `Guest request: ${g.guest_name}`],
        detail: [
          `Od ${fmtDate(g.start_date)}. Rozhodněte na Domů.`,
          `From ${fmtDate(g.start_date)}. Decide on Home.`,
        ],
        to: "/domu",
      });
    }
    for (const g of input.decidedGuestRequests ?? []) {
      if (!g.decided_at) continue;
      const who = nameOf(g.decided_by_member_id) || "správce";
      const whoEn = nameOf(g.decided_by_member_id) || "an admin";
      const approved = g.status === "APPROVED";
      out.push({
        key: `guest-decided:${g.id}`,
        kind: "guest_request",
        tone: "info",
        at: g.decided_at,
        title: approved
          ? [
              `${who} schválil(a) žádost: ${g.guest_name}`,
              `${whoEn} approved ${g.guest_name}'s request`,
            ]
          : [
              `${who} zamítl(a) žádost: ${g.guest_name}`,
              `${whoEn} declined ${g.guest_name}'s request`,
            ],
        detail: [`Od ${fmtDate(g.start_date)}`, `From ${fmtDate(g.start_date)}`],
        to: approved ? "/kalendar" : "/domu",
      });
    }
  }

  if (!input.isFamily) {
    for (const r of input.requests ?? []) {
      if (r.status !== "PENDING") continue;
      out.push({
        key: `request:${r.id}`,
        kind: "institution_request",
        tone: r.has_conflict ? "warn" : "action",
        at: r.created_at,
        title: [`Nová žádost: ${r.requester_name}`, `New request: ${r.requester_name}`],
        detail: r.has_conflict
          ? ["V kolizi s jiným pobytem.", "Clashes with another stay."]
          : [`Od ${fmtDate(r.start_date)}.`, `From ${fmtDate(r.start_date)}.`],
        to: "/zadosti",
      });
    }
  }

  for (const task of input.tasks ?? []) {
    if (task.status === "DONE") continue;
    const title = task.title_cs || task.title;
    const titleEn = task.title_en || task.title;
    const overdue = !!task.due_date && task.due_date < input.today;
    if (overdue) {
      out.push({
        key: `task-overdue:${task.id}`,
        kind: "task_overdue",
        tone: "warn",
        at: task.due_date!,
        title: [`Úkol po termínu: ${title}`, `Overdue task: ${titleEn}`],
        to: "/ukoly/$id",
        params: { id: task.id },
      });
    } else if (input.myMemberId && task.assignee_member_id === input.myMemberId) {
      out.push({
        key: `task-mine:${task.id}`,
        kind: "task_assigned",
        tone: "info",
        at: task.created_at,
        title: [`Váš úkol: ${title}`, `Your task: ${titleEn}`],
        detail: task.due_date
          ? [`Termín ${fmtDate(task.due_date)}`, `Due ${fmtDate(task.due_date)}`]
          : undefined,
        to: "/ukoly/$id",
        params: { id: task.id },
      });
    } else if (daysBetween(task.created_at, input.today) <= recent) {
      out.push({
        key: `task-new:${task.id}`,
        kind: "task_new",
        tone: "info",
        at: task.created_at,
        title: [`Nový úkol údržby: ${title}`, `New maintenance task: ${titleEn}`],
        to: "/ukoly/$id",
        params: { id: task.id },
      });
    }
  }

  if (input.isFamily && input.myMemberId) {
    // What I still owe, per person I owe it to.
    const owed = new Map<string, number>();
    for (const s of input.splits ?? []) {
      if (s.paid_back || s.member_id !== input.myMemberId) continue;
      const payer = input.expenses?.find((e) => e.id === s.expense_id)?.paid_by_member_id;
      if (!payer || payer === input.myMemberId) continue;
      owed.set(payer, (owed.get(payer) ?? 0) + Number(s.amount_owed));
    }
    for (const [payer, amount] of owed) {
      if (amount <= 0) continue;
      out.push({
        key: `owe:${payer}:${Math.round(amount)}`,
        kind: "owe",
        tone: "warn",
        at: input.today,
        title: [
          `Dlužíte ${kc(amount)} – ${nameOf(payer)}`,
          `You owe ${nameOf(payer)} ${kc(amount)}`,
        ],
        detail: ["Vyrovnejte ve Výdajích.", "Settle up in Expenses."],
        to: "/vydaje/vyrovnani",
      });
    }
  }

  for (const d of input.documents ?? []) {
    if (!d.expiry_date) continue;
    const days = daysBetween(input.today, d.expiry_date);
    if (days > 30) continue;
    out.push({
      key: `doc:${d.id}:${d.expiry_date}`,
      kind: "document_expiry",
      tone: days < 0 ? "warn" : "info",
      at: d.expiry_date,
      title:
        days < 0
          ? [`Prošla platnost: ${d.title}`, `Expired: ${d.title}`]
          : [`Brzy vyprší: ${d.title}`, `Expires soon: ${d.title}`],
      detail: [`Platnost do ${d.expiry_date}`, `Valid until ${d.expiry_date}`],
      to: "/dokumenty",
    });
  }

  return out.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
