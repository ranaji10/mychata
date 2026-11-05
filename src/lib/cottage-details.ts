import type { Property } from "@/lib/data";

export type Missing = "address" | "city" | "rooms" | "capacity" | "seasons" | "overlap" | "photo";

/**
 * What onboarding left empty for one cottage. Pure, so it's easy to test.
 * House rules are optional (bug 8, 17 Oct): they are added from Manage cottages, not nagged
 * about here. "No" to overlapping stays is an answer, not a gap (overlap_allowed, 0026).
 */
export function missingCottageDetails(
  p: Pick<Property, "address" | "city" | "rooms" | "peak_seasons" | "overlap_max_guests"> & {
    overlap_allowed?: boolean | null;
    capacity?: number | null;
  },
  hasPhoto: boolean,
): Missing[] {
  const out: Missing[] = [];
  if (!p.address?.trim()) out.push("address");
  if (!p.city?.trim()) out.push("city");
  if (!p.rooms) out.push("rooms");
  // Only once the column exists (migration 0040): before that the field is undefined.
  if (p.capacity === null) out.push("capacity");
  if (!p.peak_seasons?.length) out.push("seasons");
  if ((p.rooms ?? 0) > 3 && p.overlap_allowed == null && !p.overlap_max_guests) {
    out.push("overlap");
  }
  if (!hasPhoto) out.push("photo");
  return out;
}

/** One line for the card: "6 people · 3 rooms · 5 beds · arrival from 15:00 · …". */
/** Czech noun form for a count: 1 pokoj, 2–4 pokoje, 5+ pokojů. */
export const cz = (n: number, one: string, few: string, many: string) =>
  `${n} ${n === 1 ? one : n >= 2 && n <= 4 ? few : many}`;
/** English: 1 room, 2 rooms. */
const en = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function cottageFactsLine(p: Property, t: (cs: string, en: string) => string): string {
  const parts: string[] = [];
  if (p.capacity)
    parts.push(t(cz(p.capacity, "osoba", "osoby", "osob"), en(p.capacity, "person", "people")));
  if (p.rooms)
    parts.push(t(cz(p.rooms, "pokoj", "pokoje", "pokojů"), en(p.rooms, "room", "rooms")));
  if (p.beds) parts.push(t(cz(p.beds, "lůžko", "lůžka", "lůžek"), en(p.beds, "bed", "beds")));
  if (p.check_in_time)
    parts.push(t(`příjezd od ${p.check_in_time}`, `arrival from ${p.check_in_time}`));
  if (p.check_out_time)
    parts.push(t(`odjezd do ${p.check_out_time}`, `leave by ${p.check_out_time}`));
  if (p.pets_allowed === true) parts.push(t("zvířata ano", "pets welcome"));
  if (p.pets_allowed === false) parts.push(t("bez zvířat", "no pets"));
  return parts.join(" · ");
}

/**
 * A count typed into a count field (rooms, people, beds, guests): empty is fine (left out),
 * anything else must be a whole number from 1 to `max` (T-059: "-3 rooms" and "2.5 guests" got
 * through onboarding on 5 Nov 2026). The fields are text with a numeric keyboard, not
 * type="number", which hands "" to the app for text it can't read ("2,5" in some browsers).
 */
export function countOk(value: string, max: number): boolean {
  const v = value.trim();
  if (!v) return true;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= max;
}

/** The message under a count field that fails countOk(). */
export function countHint(max: number, t: (cs: string, en: string) => string): string {
  return t(`Zadejte celé číslo od 1 do ${max}.`, `Enter a whole number from 1 to ${max}.`);
}
