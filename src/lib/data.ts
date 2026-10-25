// Shared types, formatters and booking-overlap logic for My Chata.

export interface Account {
  id: string;
  type: "FAMILY" | "INSTITUTIONAL";
  name: string;
  /** Organisations: members' bookings confirmed without an admin. null = not decided yet (0032). */
  booking_auto_approve?: boolean | null;
  /** Last family <-> organisation change; the owner may change again six months later (0036). */
  type_changed_at?: string | null;
}

export interface Property {
  id: string;
  account_id: string;
  name: string;
  address: string;
  photo_url: string | null;
  house_rules_text: string | null;
  auto_confirm: boolean;
  handover_items: string[];
  rooms: number | null;
  city: string | null;
  overlap_max_guests: number | null;
  /** Answer to "may stays overlap?": null = never answered (migration 0026). */
  overlap_allowed?: boolean | null;
  peak_seasons: string[];
  created_by_member_id: string | null;
  public_token: string;
  public_calendar_enabled: boolean;
}

export interface Profile {
  user_id: string;
  member_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  onboarding_completed_at: string | null;
  active_account_id: string | null;
}

export interface Member {
  id: string;
  account_id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  branch: string;
  user_id: string | null;
  /** Set when the person left the account (0036); the row stays for history. */
  left_at?: string | null;
}

export interface Booking {
  id: string;
  property_id: string;
  requester_name: string;
  requester_member_id: string | null;
  start_date: string; // ISO date
  end_date: string;
  guests: number;
  note: string | null;
  status: "CONFIRMED" | "PENDING";
  created_at: string;
  /** Confirmed on creation for the booker, with nobody deciding (migration 0032). */
  auto_approved?: boolean;
  /** Who approved a held stay or a booking request, and when (migration 0034). */
  approved_by_member_id?: string | null;
  approved_at?: string | null;
}

export interface InstitutionalRequest {
  id: string;
  property_id: string;
  requester_name: string;
  requester_email: string;
  requester_phone: string | null;
  affiliation: string | null;
  start_date: string;
  end_date: string;
  guests: number;
  note: string | null;
  status: "PENDING" | "APPROVED" | "DECLINED";
  decline_reason: string | null;
  has_conflict: boolean;
  conflict_note: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  property_id: string;
  title: string;
  title_cs: string | null;
  title_en: string | null;
  description_cs: string | null;
  description_en: string | null;
  source_language: "cs" | "en";
  category: "repair" | "seasonal" | "cleaning" | "other";
  photo_url: string | null;
  urgency: "LOW" | "HIGH" | "URGENT";
  assignee_member_id: string | null;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  due_date: string | null;
  done_note: string | null;
  created_by: string;
  created_at: string;
  /** Set for tasks added as part of a seasonal checklist (T-018). */
  checklist_id?: string | null;
}

export function taskTitle(task: Task, lang: "cs" | "en"): string {
  return (lang === "en" ? task.title_en : task.title_cs) || task.title;
}

export function taskDescription(task: Task, lang: "cs" | "en"): string | null {
  return (lang === "en" ? task.description_en : task.description_cs) ?? null;
}

export interface Expense {
  id: string;
  property_id: string;
  amount: number;
  category: "utilities" | "repairs" | "supplies" | "other";
  split_method: "EQUAL" | "CUSTOM" | "BY_BRANCH";
  paid_by_member_id: string | null;
  description: string | null;
  date: string | null;
  created_at: string;
}

export interface ExpenseSplit {
  id: string;
  expense_id: string;
  member_id: string;
  amount_owed: number;
  paid_back: boolean;
  paid_back_confirmed_by: string | null;
}

export interface Handover {
  id: string;
  property_id: string;
  booking_id: string | null;
  member_id: string | null;
  checklist_state: Record<string, ChecklistEntry>;
  note: string | null;
  photo_url: string | null;
  submitted_at: string;
}

// ---------- Handover checklist ----------

/** "na" is what handovers saved before 28 Sep 2026 used for an unticked item; read it as skipped. */
export type ChecklistEntry = { state: "checked" | "skipped" | "na"; reason?: string };

/** What is stored for a handover: every item, marked done or skipped. */
export function buildChecklistState(
  items: string[],
  checked: boolean[],
): Record<string, ChecklistEntry> {
  return Object.fromEntries(
    items.map((item, i) => [item, { state: checked[i] ? "checked" : "skipped" }]),
  );
}

export function checklistProgress(state: Record<string, ChecklistEntry> | null | undefined): {
  done: number;
  total: number;
} {
  const entries = Object.values(state ?? {});
  return { done: entries.filter((e) => e.state === "checked").length, total: entries.length };
}

// ---------- Expense settlement ----------

/**
 * not_split: nobody else owes anything (only the payer was in the split).
 * settled: there are splits and every one is paid back.
 */
export type ExpenseSettlement = "not_split" | "unsettled" | "settled";

export function expenseSettlement(splits: { paid_back: boolean }[]): ExpenseSettlement {
  if (splits.length === 0) return "not_split";
  return splits.every((s) => s.paid_back) ? "settled" : "unsettled";
}

export interface SettlementSuggestion {
  from: string;
  to: string;
  amount: number;
}

/**
 * Who pays whom, netted per pair: if Jana owes Petr 300 and Petr owes Jana 100, the
 * suggestion is Jana → Petr 200. Settling marks both directions paid (settle_debt()).
 */
export function settlementSuggestions(
  expenses: { id: string; paid_by_member_id: string | null }[],
  splits: {
    expense_id: string;
    member_id: string;
    amount_owed: number | string;
    paid_back: boolean;
  }[],
): SettlementSuggestion[] {
  const payerOf = new Map(expenses.map((e) => [e.id, e.paid_by_member_id]));
  const owes = new Map<string, number>(); // "debtor->payer" => amount
  for (const s of splits) {
    if (s.paid_back) continue;
    const payer = payerOf.get(s.expense_id);
    if (!payer || payer === s.member_id) continue;
    const key = `${s.member_id}->${payer}`;
    owes.set(key, (owes.get(key) ?? 0) + Number(s.amount_owed));
  }
  const result: SettlementSuggestion[] = [];
  const seen = new Set<string>();
  for (const [key, amount] of owes) {
    if (seen.has(key)) continue;
    const [from = "", to = ""] = key.split("->");
    const reverseKey = `${to}->${from}`;
    seen.add(key);
    seen.add(reverseKey);
    const net = Math.round((amount - (owes.get(reverseKey) ?? 0)) * 100) / 100;
    if (net > 0) result.push({ from, to, amount: net });
    else if (net < 0) result.push({ from: to, to: from, amount: -net });
  }
  return result.filter((r) => r.amount >= 1);
}

/**
 * Home's expenses tile (T-045, D-25): what the viewer owes and is owed, and the cottage's open
 * total, all from the same netted suggestions Settle debts shows, so the numbers agree.
 */
export function debtSummary(
  suggestions: SettlementSuggestion[],
  memberId: string | null | undefined,
): { youOwe: number; owedToYou: number; cottageTotal: number } {
  const round = (n: number) => Math.round(n * 100) / 100;
  let youOwe = 0;
  let owedToYou = 0;
  let cottageTotal = 0;
  for (const s of suggestions) {
    cottageTotal += s.amount;
    if (memberId && s.from === memberId) youOwe += s.amount;
    if (memberId && s.to === memberId) owedToYou += s.amount;
  }
  return { youOwe: round(youOwe), owedToYou: round(owedToYou), cottageTotal: round(cottageTotal) };
}

/** Czech-style amounts: "1 250,50", "1250.5", "1 000" → number; anything else → NaN. */
export function parseAmount(input: string): number {
  const cleaned = input
    .replace(/[\s\u00a0]/g, "")
    .replace(/kč$/i, "")
    .replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return Number.NaN;
  return Math.round(Number(cleaned) * 100) / 100;
}

/**
 * Splits a total into equal shares in whole hellers so the shares add up exactly
 * (100 Kč between 3 → 33.34, 33.33, 33.33).
 */
export function equalShares(total: number, count: number): number[] {
  if (count <= 0) return [];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / count);
  const rest = cents - base * count;
  return Array.from({ length: count }, (_, i) => (base + (i < rest ? 1 : 0)) / 100);
}

// ---------- Formatting (Czech locale) ----------

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return `${fmtDate(iso)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function fmtKc(amount: number): string {
  return (
    Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " Kč"
  );
}

/**
 * Debts to pay back, to the haléř when not whole: 1 000 Kč split three ways is 333,34 + 333,33,
 * and rounding each to 333 Kč made the rows disagree with the 667 Kč total (25 Oct check).
 */
export function fmtKcExact(amount: number): string {
  const cents = Math.round(amount * 100);
  if (cents % 100 === 0) return fmtKc(cents / 100);
  const whole = Math.trunc(Math.abs(cents) / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const frac = String(Math.abs(cents) % 100).padStart(2, "0");
  return `${cents < 0 ? "−" : ""}${whole},${frac} Kč`;
}

export function todayISO(): string {
  return localISO(new Date());
}

/** A date as YYYY-MM-DD in local time. `toISOString()` is UTC, which is the previous day
 *  in Czechia between midnight and 1–2 am, and for any local-midnight date. */
export function localISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------- Overlap detection (shared by J1 bookings and J7 requests) ----------

export type Conflict =
  | { kind: "hard"; other: { name: string; start: string; end: string } }
  | { kind: "same-day"; other: { name: string; start: string; end: string } };

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function isSameDayChangeover(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart === bEnd || bStart === aEnd;
}

/** Check a candidate range against existing bookings/requests. Hard conflict = shared day; same-day changeover = soft. */
export function findConflicts(
  start: string,
  end: string,
  others: { requester_name: string; start_date: string; end_date: string }[],
): Conflict[] {
  const out: Conflict[] = [];
  for (const o of others) {
    if (!rangesOverlap(start, end, o.start_date, o.end_date)) continue;
    const base = { name: o.requester_name, start: o.start_date, end: o.end_date };
    if (
      isSameDayChangeover(start, end, o.start_date, o.end_date) &&
      start !== o.start_date &&
      end !== o.end_date
    ) {
      out.push({ kind: "same-day", other: base });
    } else {
      out.push({ kind: "hard", other: base });
    }
  }
  return out;
}

/**
 * Most guests on any one night of [start, end) from confirmed and pending stays: the number
 * the overlap rule compares with the cottage's limit (mirrors overlap_peak_guests, 0028).
 */
export function overlapPeakGuests(
  start: string,
  end: string,
  others: { start_date: string; end_date: string; guests?: number | null; status: string }[],
): number {
  const nights: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  const last = end > start ? end : addDaysIso(start, 1);
  while (nights.length < 400) {
    const iso = d.toISOString().slice(0, 10);
    if (iso >= last) break;
    nights.push(iso);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  let peak = 0;
  for (const night of nights) {
    let sum = 0;
    for (const o of others) {
      if (
        (o.status === "CONFIRMED" || o.status === "PENDING") &&
        o.start_date <= night &&
        night < o.end_date
      ) {
        sum += o.guests ?? 1;
      }
    }
    peak = Math.max(peak, sum);
  }
  return peak;
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ---------- Picking a stay on the calendar ----------

export interface DateRange {
  start: string | null;
  end: string | null;
}

/**
 * Tap-to-pick: the first tap is the arrival, the second the departure. A second tap before
 * the arrival starts again from that day; a tap after a finished range starts a new one.
 */
export function pickRange(range: DateRange, iso: string): DateRange {
  if (!range.start || range.end) return { start: iso, end: null };
  if (iso < range.start) return { start: iso, end: null };
  return { start: range.start, end: iso };
}

/** A YYYY-MM-DD string that is a real date, or null. Used for dates passed in the address. */
export function isoDateOrNull(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`); // UTC, so the check works in every time zone
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== value ? null : value;
}

// ---------- Calendar helpers ----------

export const CZ_MONTHS = [
  "Leden",
  "Únor",
  "Březen",
  "Duben",
  "Květen",
  "Červen",
  "Červenec",
  "Srpen",
  "Září",
  "Říjen",
  "Listopad",
  "Prosinec",
];
export const CZ_DAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
export const EN_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const EN_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export function monthNames(lang: "cs" | "en") {
  return lang === "en" ? EN_MONTHS : CZ_MONTHS;
}
export function dayNames(lang: "cs" | "en") {
  return lang === "en" ? EN_DAYS : CZ_DAYS;
}

export interface CalendarDay {
  iso: string;
  day: number;
  inMonth: boolean;
}

/** Monday-first grid of days covering the whole month. */
export function monthGrid(year: number, month: number): CalendarDay[] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday = 0
  const days: CalendarDay[] = [];
  const start = new Date(year, month, 1 - startOffset);
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    days.push({ iso, day: d.getDate(), inMonth: d.getMonth() === month });
  }
  // trim trailing row if fully outside month
  while (days.length > 35 && days.slice(-7).every((d) => !d.inMonth)) {
    days.splice(-7);
  }
  return days;
}

// ---------- Category / label maps ----------

export const TASK_CATEGORY: Record<Task["category"], string> = {
  repair: "Oprava",
  seasonal: "Sezónní",
  cleaning: "Úklid",
  other: "Ostatní",
};

export const URGENCY: Record<Task["urgency"], string> = {
  LOW: "Nízká",
  HIGH: "Vysoká",
  URGENT: "Urgentní",
};

export const EXPENSE_CATEGORY: Record<Expense["category"], string> = {
  utilities: "Energie a poplatky",
  repairs: "Opravy",
  supplies: "Nákupy a zásoby",
  other: "Ostatní",
};

export const DECLINE_REASONS = [
  "Termín není dostupný",
  "Nesplňuje podmínky ubytování",
  "Jiný důvod",
];

// ---------- English label maps ----------

export const TASK_CATEGORY_EN: Record<Task["category"], string> = {
  repair: "Repair",
  seasonal: "Seasonal",
  cleaning: "Cleaning",
  other: "Other",
};

export const URGENCY_EN: Record<Task["urgency"], string> = {
  LOW: "Low",
  HIGH: "High",
  URGENT: "Urgent",
};

export const EXPENSE_CATEGORY_EN: Record<Expense["category"], string> = {
  utilities: "Utilities & fees",
  repairs: "Repairs",
  supplies: "Supplies",
  other: "Other",
};

export const DECLINE_REASONS_EN = [
  "Dates are not available",
  "Does not meet stay conditions",
  "Other reason",
];

export function taskCategoryLabel(c: Task["category"], lang: "cs" | "en") {
  return (lang === "en" ? TASK_CATEGORY_EN : TASK_CATEGORY)[c];
}
export function urgencyLabel(u: Task["urgency"], lang: "cs" | "en") {
  return (lang === "en" ? URGENCY_EN : URGENCY)[u];
}
export function expenseCategoryLabel(c: Expense["category"], lang: "cs" | "en") {
  return (lang === "en" ? EXPENSE_CATEGORY_EN : EXPENSE_CATEGORY)[c];
}
export function declineReasons(lang: "cs" | "en") {
  return lang === "en" ? DECLINE_REASONS_EN : DECLINE_REASONS;
}

// Family branch colors for the calendar legend.
export const BRANCH_COLORS = ["#1F7A4D", "#2E6FB0", "#0F766E", "#B45309", "#7C5CBF"];
export function branchColor(branch: string, branches: string[]): string {
  const i = Math.max(0, branches.indexOf(branch));
  return BRANCH_COLORS[i % BRANCH_COLORS.length] ?? "#1F7A4D";
}

// Seasonal checklist templates (J2)
export const SEASONAL_TEMPLATES: {
  id: string;
  title: string;
  description: string;
  tasks: string[];
}[] = [
  {
    id: "winter",
    title: "Zazimování chaty",
    description: "Příprava na zimu — voda, topení, zabezpečení.",
    tasks: [
      "Vypustit vodu z rozvodů a bojleru",
      "Zkontrolovat a vyměnit těsnění oken",
      "Nakupit dostatek dřeva a paliva",
      "Zkontrolovat střechu a okapy před sněhem",
      "Zabezpečit zahradní nábytek",
    ],
  },
  {
    id: "spring",
    title: "Jarní otevření",
    description: "Uvedení chaty do provozu po zimě.",
    tasks: [
      "Pustit vodu a zkontrolovat netěsnosti",
      "Vyčistit okapy a okolí domu",
      "Zkontrolovat elektřinu a jističe",
      "Vyvětrat a vyklidit interiér",
      "Provést revizi krbu a komína",
    ],
  },
  {
    id: "summer",
    title: "Letní příprava",
    description: "Sezóna v plném proudu — zahrada a zásoby.",
    tasks: [
      "Posekat trávu a upravit zahradu",
      "Zkontrolovat gril a nádobí",
      "Doplnit zásoby (toaletní papír, sůl, utěrky)",
      "Zkontrolovat repelent a lékárničku",
      "Vyčistit terasu a venkovní sezení",
    ],
  },
];

export const SEASONAL_TEMPLATES_EN: {
  id: string;
  title: string;
  description: string;
  tasks: string[];
}[] = [
  {
    id: "winter",
    title: "Winterising the cottage",
    description: "Getting ready for winter — water, heating, security.",
    tasks: [
      "Drain water pipes and the boiler",
      "Check and replace window seals",
      "Stock up on firewood and fuel",
      "Check roof and gutters before snowfall",
      "Secure the garden furniture",
    ],
  },
  {
    id: "spring",
    title: "Spring opening",
    description: "Bringing the cottage back into use after winter.",
    tasks: [
      "Turn the water back on and check for leaks",
      "Clean the gutters and around the house",
      "Check the electrics and breakers",
      "Air out and tidy the interior",
      "Have the fireplace and chimney inspected",
    ],
  },
  {
    id: "summer",
    title: "Summer prep",
    description: "Peak season — garden and supplies.",
    tasks: [
      "Mow the lawn and tidy the garden",
      "Check the grill and cookware",
      "Restock supplies (toilet paper, salt, cloths)",
      "Check insect repellent and first aid kit",
      "Clean the terrace and outdoor seating",
    ],
  },
];

export function seasonalTemplates(lang: "cs" | "en") {
  return lang === "en" ? SEASONAL_TEMPLATES_EN : SEASONAL_TEMPLATES;
}

// ---------- Phone numbers ----------

/**
 * Normalises a phone number to international form (+420 777 123 456 → +420777123456).
 * A bare 9-digit number is taken as Czech. Empty input is allowed (no phone).
 * Returns null for anything that can't be a phone number (B-016).
 */
export function normalizePhone(input: string): { value: string | null } | null {
  const trimmed = input.trim();
  if (trimmed === "") return { value: null };
  if (!/^[+0-9\s().\-/]+$/.test(trimmed)) return null;
  let digits = trimmed.replace(/[\s().\-/]/g, "");
  if (digits.startsWith("00")) digits = "+" + digits.slice(2);
  if (/^\d{9}$/.test(digits)) digits = "+420" + digits;
  if (!/^\+[1-9]\d{7,14}$/.test(digits)) return null;
  return { value: digits };
}

/** "1 guest", "3 guests" / "1 host", "3 hosté", "5 hostů" (T-026: lists said "1 guests"). */
export function guestCount(n: number, lang: "cs" | "en"): string {
  if (lang === "en") return `${n} ${n === 1 ? "guest" : "guests"}`;
  return `${n} ${n === 1 ? "host" : n >= 2 && n <= 4 ? "hosté" : "hostů"}`;
}

/** House manual section categories, stored as codes ("wifi", "rules"); shown as words (T-038). */
const MANUAL_CATEGORY: Record<string, [cs: string, en: string]> = {
  wifi: ["Wi-Fi", "Wi-Fi"],
  heating: ["Topení", "Heating"],
  water: ["Voda", "Water"],
  waste: ["Odpad", "Waste"],
  emergency: ["Nouzové situace", "Emergencies"],
  rules: ["Pravidla domu", "House rules"],
  other: ["Ostatní", "Other"],
};

export const MANUAL_CATEGORIES = Object.keys(MANUAL_CATEGORY);

export function manualCategoryLabel(code: string, lang: "cs" | "en"): string {
  const hit = MANUAL_CATEGORY[code.toLowerCase()];
  return hit ? hit[lang === "en" ? 1 : 0] : code;
}
