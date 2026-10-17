import type { Property } from "@/lib/data";

export type Missing = "address" | "city" | "rooms" | "seasons" | "overlap" | "photo";

/**
 * What onboarding left empty for one cottage. Pure, so it's easy to test.
 * House rules are optional (bug 8, 17 Oct): they are added from Manage cottages, not nagged
 * about here. "No" to overlapping stays is an answer, not a gap (overlap_allowed, 0026).
 */
export function missingCottageDetails(
  p: Pick<Property, "address" | "city" | "rooms" | "peak_seasons" | "overlap_max_guests"> & {
    overlap_allowed?: boolean | null;
  },
  hasPhoto: boolean,
): Missing[] {
  const out: Missing[] = [];
  if (!p.address?.trim()) out.push("address");
  if (!p.city?.trim()) out.push("city");
  if (!p.rooms) out.push("rooms");
  if (!p.peak_seasons?.length) out.push("seasons");
  if ((p.rooms ?? 0) > 3 && p.overlap_allowed == null && !p.overlap_max_guests) {
    out.push("overlap");
  }
  if (!hasPhoto) out.push("photo");
  return out;
}
