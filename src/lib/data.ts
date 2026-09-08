// Shared types, formatters and booking-overlap logic for My Chata.

export interface Account {
  id: string;
  type: "FAMILY" | "INSTITUTIONAL";
  name: string;
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
}

export interface Member {
  id: string;
  account_id: string;
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  branch: string;
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
  category: "repair" | "seasonal" | "cleaning" | "other";
  photo_url: string | null;
  urgency: "LOW" | "HIGH" | "URGENT";
  assignee_member_id: string | null;
  status: "OPEN" | "IN_PROGRESS" | "DONE";
  due_date: string | null;
  done_note: string | null;
  created_by: string;
  created_at: string;
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
  checklist_state: Record<string, { state: "checked" | "na"; reason?: string }>;
  note: string | null;
  photo_url: string | null;
  submitted_at: string;
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

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---------- Overlap detection (shared by J1 bookings and J7 requests) ----------

export type Conflict =
  | { kind: "hard"; other: { name: string; start: string; end: string } }
  | { kind: "same-day"; other: { name: string; start: string; end: string } };

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

export function isSameDayChangeover(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
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
    if (isSameDayChangeover(start, end, o.start_date, o.end_date) && start !== o.start_date && end !== o.end_date) {
      out.push({ kind: "same-day", other: base });
    } else {
      out.push({ kind: "hard", other: base });
    }
  }
  return out;
}

// ---------- Calendar helpers ----------

export const CZ_MONTHS = [
  "Leden", "Únor", "Březen", "Duben", "Květen", "Červen",
  "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec",
];
export const CZ_DAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];
export const EN_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
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
export const BRANCH_COLORS = ["#FF5A5F", "#2E6FB0", "#16A34A", "#B45309", "#7C5CBF"];
export function branchColor(branch: string, branches: string[]): string {
  const i = Math.max(0, branches.indexOf(branch));
  return BRANCH_COLORS[i % BRANCH_COLORS.length] ?? "#FF5A5F";
}

// Seasonal checklist templates (J2)
export const SEASONAL_TEMPLATES: { id: string; title: string; description: string; tasks: string[] }[] = [
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

export const SEASONAL_TEMPLATES_EN: { id: string; title: string; description: string; tasks: string[] }[] = [
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
