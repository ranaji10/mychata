import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import type { Property } from "@/lib/data";
import { missingCottageDetails, type Missing } from "@/lib/cottage-details";
import { useLang } from "@/lib/i18n";

const SEASONS = [
  { id: "summer", cs: "Léto", en: "Summer" },
  { id: "winter", cs: "Zima", en: "Winter" },
  { id: "holidays", cs: "Svátky", en: "Holidays" },
] as const;

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
      const { data, error } = await supabase
        .from("property_photos")
        .select("property_id")
        .in("property_id", ids);
      if (error) throw error;
      return { photos: (data ?? []).map((r) => r.property_id) };
    },
  });

  if (!isAdmin || !extras) return null;
  const todo = properties
    .map((p) => ({
      property: p,
      missing: missingCottageDetails(p, extras.photos.includes(p.id)),
    }))
    .filter((x) => x.missing.length > 0);
  if (!todo.length) return null;

  return (
    <section className="card mt-4 p-4">
      <h2 className="flex items-center gap-2 text-[16px] font-bold">
        <ClipboardList className="size-5 text-primary" />
        {t("Doplňte údaje o chatě", "Finish setting up your cottage")}
      </h2>
      <p className="mt-1 text-[16px] text-muted-foreground">
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
  const [overlapAllowed, setOverlapAllowed] = useState<boolean | null>(null);
  const [overlap, setOverlap] = useState("");

  const label: Record<Missing, string> = {
    address: t("adresa", "address"),
    city: t("město", "city"),
    rooms: t("počet pokojů", "number of rooms"),
    seasons: t("rušná období", "busy seasons"),
    overlap: t("pravidlo pro překrývání pobytů", "overlapping stays rule"),
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
      });
      if (error) throw error;
      if (overlapAllowed !== null) {
        const { error: overlapError } = await supabase.rpc("set_property_overlap", {
          _property_id: property.id,
          _allowed: overlapAllowed,
          ...(overlapAllowed && overlap ? { _max_guests: Number(overlap) } : {}),
        });
        if (overlapError) throw overlapError;
      }
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["properties"] }),
        queryClient.invalidateQueries({ queryKey: ["cottage-setup"] }),
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
      <p className="text-[16px] text-muted-foreground">
        {t("Chybí: ", "Missing: ")}
        {missing.map((m) => label[m]).join(", ")}
      </p>
      {missing.includes("photo") && (
        <Link
          to="/fotky"
          onClick={() => active?.id !== property.id && setActivePropertyId(property.id)}
          className="mt-2 inline-flex min-h-11 items-center text-[16px] font-bold text-primary"
        >
          {t("Přidat fotky chaty", "Add cottage photos")}
        </Link>
      )}
      {formFields.length > 0 && !open && (
        <Button
          variant="fresh"
          size="fresh"
          className="btn-secondary mt-2 w-full bg-card"
          onClick={() => setOpen(true)}
        >
          {t("Doplnit", "Fill in")}
        </Button>
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
              <p className="text-[16px] font-bold">{t("Rušná období", "Busy seasons")}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {SEASONS.map((s) => (
                  <Button
                    variant="fresh"
                    size="fresh"
                    key={s.id}
                    type="button"
                    onClick={() =>
                      setSeasons((v) =>
                        v.includes(s.id) ? v.filter((x) => x !== s.id) : [...v, s.id],
                      )
                    }
                    className={`pill min-h-[44px] px-4 ${
                      seasons.includes(s.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-muted-foreground"
                    }`}
                  >
                    {lang === "cs" ? s.cs : s.en}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {(missing.includes("overlap") || (missing.includes("rooms") && roomsNumber > 3)) && (
            <div className="space-y-2">
              <p className="text-[16px] font-bold">
                {t("Mohou se pobyty překrývat?", "May stays overlap?")}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="fresh"
                  size="fresh"
                  type="button"
                  aria-pressed={overlapAllowed === true}
                  className={`btn-secondary bg-card ${overlapAllowed === true ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setOverlapAllowed(true)}
                >
                  {t("Ano", "Yes")}
                </Button>
                <Button
                  variant="fresh"
                  size="fresh"
                  type="button"
                  aria-pressed={overlapAllowed === false}
                  className={`btn-secondary bg-card ${overlapAllowed === false ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setOverlapAllowed(false)}
                >
                  {t("Ne", "No")}
                </Button>
              </div>
              {overlapAllowed && (
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
            </div>
          )}
          <div className="flex gap-2">
            <Button
              variant="fresh"
              size="fresh"
              className="btn-primary flex-1"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              {save.isPending ? t("Ukládám…", "Saving…") : t("Uložit", "Save")}
            </Button>
            <Button
              variant="fresh"
              size="fresh"
              className="btn-secondary bg-card"
              onClick={() => setOpen(false)}
            >
              {t("Zrušit", "Cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
