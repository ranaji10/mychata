// Notifications (bug 5, 18 Oct 2026): one place for "what happened and what needs me".
//
// Built from data the app already reads, so nothing new has to be stored yet. Each source adds
// items through `buildNotifications`; a new feature (bills, messages, emails) adds a field to
// NotificationInput and a block below, and the page, the badge and the tests pick it up.
import type { Booking, ExpenseSplit, InstitutionalRequest, Member, Task } from "@/lib/data";

export type NotificationKind =
  | "invitation"
  | "approval"
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
  members: Pick<Member, "id" | "name">[];
  invitations?: PendingInvitation[] | null;
  bookings?: Booking[] | null;
  guestRequests?: { id: string; guest_name: string; start_date: string; created_at: string }[] | null;
  requests?: InstitutionalRequest[] | null;
  tasks?: Task[] | null;
  splits?: ExpenseSplit[] | null;
  expenses?: { id: string; paid_by_member_id: string | null }[] | null;
  documents?: DocumentLite[] | null;
}

function daysBetween(a: string, b: string) {
  return Math.round(
    (new Date(`${b.slice(0, 10)}T00:00:00`).getTime() -
      new Date(`${a.slice(0, 10)}T00:00:00`).getTime()) /
      86400000,
  );
}

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
        detail: [`${b.start_date} – ${b.end_date}`, `${b.start_date} – ${b.end_date}`],
        to: "/rezervace/$id",
        params: { id: b.id },
      });
    }
    for (const g of input.guestRequests ?? []) {
      out.push({
        key: `guest:${g.id}`,
        kind: "guest_request",
        tone: "action",
        at: g.created_at,
        title: [`Žádost hosta: ${g.guest_name}`, `Guest request: ${g.guest_name}`],
        detail: [`Od ${g.start_date}. Rozhodněte na Domů.`, `From ${g.start_date}. Decide on Home.`],
        to: "/domu",
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
          : [`Od ${r.start_date}.`, `From ${r.start_date}.`],
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
        detail: task.due_date ? [`Termín ${task.due_date}`, `Due ${task.due_date}`] : undefined,
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

