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
export function cottageFactsLine(p: Property, t: (cs: string, en: string) => string): string {
  const parts: string[] = [];
  if (p.capacity) parts.push(t(`${p.capacity} osob`, `${p.capacity} people`));
  if (p.rooms) parts.push(t(`${p.rooms} pokoje`, `${p.rooms} rooms`));
  if (p.beds) parts.push(t(`${p.beds} lůžek`, `${p.beds} beds`));
  if (p.check_in_time)
    parts.push(t(`příjezd od ${p.check_in_time}`, `arrival from ${p.check_in_time}`));
  if (p.check_out_time)
    parts.push(t(`odjezd do ${p.check_out_time}`, `leave by ${p.check_out_time}`));
  if (p.pets_allowed === true) parts.push(t("zvířata ano", "pets welcome"));
  if (p.pets_allowed === false) parts.push(t("bez zvířat", "no pets"));
  return parts.join(" · ");
}
