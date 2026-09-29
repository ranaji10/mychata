import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import type { Property } from "@/lib/data";
import { useLang } from "@/lib/i18n";

const SEASONS = [
  { id: "summer", cs: "Léto", en: "Summer" },
  { id: "winter", cs: "Zima", en: "Winter" },
  { id: "holidays", cs: "Svátky", en: "Holidays" },
] as const;

type Missing = "address" | "city" | "rooms" | "seasons" | "overlap" | "rules" | "photo";

/** What onboarding left empty for one cottage. Pure, so it's easy to test. */
export function missingCottageDetails(
  p: Pick<Property, "address" | "city" | "rooms" | "peak_seasons" | "overlap_max_guests">,
  hasRules: boolean,
  hasPhoto: boolean,
): Missing[] {
  const out: Missing[] = [];
  if (!p.address?.trim()) out.push("address");
  if (!p.city?.trim()) out.push("city");
  if (!p.rooms) out.push("rooms");
  if (!p.peak_seasons?.length) out.push("seasons");
  if ((p.rooms ?? 0) > 3 && !p.overlap_max_guests) out.push("overlap");
  if (!hasRules) out.push("rules");
  if (!hasPhoto) out.push("photo");
  return out;
}

/**
 * "Finish setting up" on My profile (T-021): for each cottage the person administers, the
 * questions skipped during onboarding, with a short form for exactly those.
 */
export function CottageSetup() {
  const { t } = useLang();
  const { properties, currentMember } = useAccount();
  const isAdmin = currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";
  const ids = properties.map((p) => p.id);

  const { data: extras } = useQuery({
    queryKey: ["cottage-setup", ids.join(",")],
    enabled: isAdmin && ids.length > 0,
    queryFn: async () => {
      const [rules, photos] = await Promise.all([
        supabase.from("manual_sections").select("property_id").eq("category", "rules").in("property_id", ids),
        supabase.from("property_photos").select("property_id").in("property_id", ids),
      ]);
      if (rules.error) throw rules.error;
      if (photos.error) throw photos.error;
      return {
        rules: (rules.data ?? []).map((r) => r.property_id),
        photos: (photos.data ?? []).map((r) => r.property_id),
      };
    },
  });

  if (!isAdmin || !extras) return null;
  const todo = properties
    .map((p) => ({
      property: p,
      missing: missingCottageDetails(p, extras.rules.includes(p.id), extras.photos.includes(p.id)),
    }))
    .filter((x) => x.missing.length > 0);
  if (!todo.length) return null;

  return (
    <section className="card mt-4 p-4">
      <h2 className="flex items-center gap-2 text-[15px] font-bold">
        <ClipboardList className="size-5 text-primary" />
        {t("Doplňte údaje o chatě", "Finish setting up your cottage")}
      </h2>
      <p className="mt-1 text-[13px] text-muted-foreground">
        {t(
          "Tyto otázky zůstaly při zakládání bez odpovědi.",
          "These questions were left unanswered during setup.",
        )}
      </p>
      <div className="mt-3 space-y-3">
        {todo.map(({ property, missing }) => (
          <CottageForm key={property.id} property={property} missing={missing} />
        ))}
      </div>
    </section>
  );
}

function CottageForm({ property, missing }: { property: Property; missing: Missing[] }) {
  const { t, lang } = useLang();
  const queryClient = useQueryClient();
  const { property: active, setActivePropertyId } = useAccount();
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [rooms, setRooms] = useState("");
  const [seasons, setSeasons] = useState<string[]>([]);
  const [overlap, setOverlap] = useState("");
  const [rules, setRules] = useState("");

  const label: Record<Missing, string> = {
    address: t("adresa", "address"),
    city: t("město", "city"),
    rooms: t("počet pokojů", "number of rooms"),
    seasons: t("rušná období", "busy seasons"),
    overlap: t("pravidlo pro překrývání pobytů", "overlapping stays rule"),
    rules: t("pravidla domu", "house rules"),
    photo: t("hlavní fotka", "main photo"),
  };
  const roomsNumber = rooms ? Number(rooms) : (property.rooms ?? 0);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("update_property_details", {
        _property_id: property.id,
        ...(address.trim() ? { _address: address.trim() } : {}),
        ...(city.trim() ? { _city: city.trim() } : {}),
        ...(rooms ? { _rooms: Number(rooms) } : {}),
        ...(seasons.length ? { _seasons: seasons } : {}),
        ...(overlap ? { _overlap_max_guests: Number(overlap) } : {}),
      });
      if (error) throw error;
      if (rules.trim()) {
        const { error: rulesError } = await supabase.from("manual_sections").insert({
          property_id: property.id,
          category: "rules",
          title_cs: "Pravidla domu",
          title_en: "House rules",
          content_cs: rules.trim(),
          content_en: rules.trim(),
          visibility: "PUBLIC",
          display_order: 0,
        });
        if (rulesError) throw rulesError;
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["properties"] }),
        queryClient.invalidateQueries({ queryKey: ["cottage-setup"] }),
        queryClient.invalidateQueries({ queryKey: ["manual-sections", property.id] }),
      ]);
      setOpen(false);
      toast.success(t("Údaje o chatě uloženy.", "Cottage details saved."));
    },
    onError: (error) => {
      console.error("[profil] cottage details", error);
      toast.error(t(`Uložení se nepodařilo: ${error.message}`, `Could not save: ${error.message}`));
    },
  });

  const formFields = missing.filter((m) => m !== "photo");
  return (
    <div className="rounded-2xl bg-secondary p-3">
      <p className="font-bold">{property.name}</p>
      <p className="text-[13px] text-muted-foreground">
        {t("Chybí: ", "Missing: ")}
        {missing.map((m) => label[m]).join(", ")}
      </p>
      {missing.includes("photo") && (
        <Link
          to="/fotky"
          onClick={() => active?.id !== property.id && setActivePropertyId(property.id)}
          className="mt-2 inline-flex min-h-11 items-center text-[14px] font-bold text-primary"
        >
          {t("Přidat fotky chaty", "Add cottage photos")}
        </Link>
      )}
      {formFields.length > 0 && !open && (
        <button className="btn-secondary mt-2 w-full bg-card" onClick={() => setOpen(true)}>
          {t("Doplnit", "Fill in")}
        </button>
      )}
      {open && (
        <div className="mt-3 space-y-2">
          {missing.includes("address") && (
            <input
              className="field w-full"
              placeholder={t("Adresa", "Address")}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          )}
          {missing.includes("city") && (
            <input
              className="field w-full"
              placeholder={t("Město", "City")}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          )}
          {missing.includes("rooms") && (
            <input
              className="field w-full"
              type="number"
              min={1}
              placeholder={t("Počet pokojů", "Number of rooms")}
              value={rooms}
              onChange={(e) => setRooms(e.target.value)}
            />
          )}
          {missing.includes("seasons") && (
            <div>
              <p className="text-[14px] font-bold">{t("Rušná období", "Busy seasons")}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {SEASONS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      setSeasons((v) => (v.includes(s.id) ? v.filter((x) => x !== s.id) : [...v, s.id]))
                    }
                    className={`pill min-h-[44px] px-4 ${
                      seasons.includes(s.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground"
                    }`}
                  >
                    {lang === "cs" ? s.cs : s.en}
                  </button>
                ))}
              </div>
            </div>
          )}
          {(missing.includes("overlap") || (missing.includes("rooms") && roomsNumber > 3)) && (
            <input
              className="field w-full"
              type="number"
              min={1}
              placeholder={t(
                "Max. hostů naráz, než rozhoduje správce",
                "Max guests at once before admin approval",
              )}
              value={overlap}
              onChange={(e) => setOverlap(e.target.value)}
            />
          )}
          {missing.includes("rules") && (
            <textarea
              className="field min-h-24 w-full"
              placeholder={t(
                "Pravidla domu, např. tichá noc od 22:00…",
                "House rules, e.g. quiet hours after 10 pm…",
              )}
              value={rules}
              onChange={(e) => setRules(e.target.value)}
            />
          )}
          <div className="flex gap-2">
            <button
              className="btn-primary flex-1"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending ? t("Ukládám…", "Saving…") : t("Uložit", "Save")}
            </button>
            <button className="btn-secondary bg-card" onClick={() => setOpen(false)}>
              {t("Zrušit", "Cancel")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
