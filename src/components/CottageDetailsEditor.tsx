// "Cottage details" on Manage cottages (T-057): the facts about one cottage, editable by its admins
// at any time, not only when onboarding left them empty. Saved by update_property_details()
// (migration 0040), which leaves a field as it is when it is sent empty.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CottageFieldHint } from "@/components/CottageFieldHint";
import { supabase } from "@/integrations/supabase/client";
import type { Property } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { friendlyError } from "@/lib/rpc-errors";
import { countHint, countOk } from "@/lib/cottage-details";

// Whole numbers only. An empty field keeps the saved value; anything else that isn't a whole
// number from 1 is shown under its field and blocks Save (T-059: "0 rooms" used to be dropped
// while the app said "saved").
const num = (v: string) => {
  const n = Number(v.trim());
  return v.trim() && Number.isInteger(n) && n >= 1 ? n : undefined;
};
const TIME = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;

export function CottageDetailsEditor({
  property,
  onDone,
}: {
  property: Property;
  onDone: () => void;
}) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [address, setAddress] = useState(property.address ?? "");
  const [city, setCity] = useState(property.city ?? "");
  const [rooms, setRooms] = useState(property.rooms ? String(property.rooms) : "");
  const [capacity, setCapacity] = useState(property.capacity ? String(property.capacity) : "");
  const [beds, setBeds] = useState(property.beds ? String(property.beds) : "");
  const [checkIn, setCheckIn] = useState(property.check_in_time ?? "");
  const [checkOut, setCheckOut] = useState(property.check_out_time ?? "");
  const [pets, setPets] = useState<boolean | null>(property.pets_allowed ?? null);

  const badTime = [checkIn, checkOut].some((v) => v.trim() && !TIME.test(v.trim()));
  const badNumber = !countOk(rooms, 200) || !countOk(capacity, 500) || !countOk(beds, 500);
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("update_property_details", {
        _property_id: property.id,
        ...(address.trim() ? { _address: address.trim() } : {}),
        ...(city.trim() ? { _city: city.trim() } : {}),
        ...(num(rooms) ? { _rooms: num(rooms)! } : {}),
        ...(num(capacity) ? { _capacity: num(capacity)! } : {}),
        ...(num(beds) ? { _beds: num(beds)! } : {}),
        ...(checkIn.trim() ? { _check_in_time: checkIn.trim() } : {}),
        ...(checkOut.trim() ? { _check_out_time: checkOut.trim() } : {}),
        ...(pets !== null ? { _pets_allowed: pets } : {}),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["properties"] }),
        queryClient.invalidateQueries({ queryKey: ["cottage-setup"] }),
      ]);
      toast.success(t("Údaje o chatě uloženy.", "Cottage details saved."));
      onDone();
    },
    onError: (error) => {
      console.error("[chaty] cottage details", error);
      const message = friendlyError(error.message, t);
      toast.error(t(`Uložení se nepodařilo: ${message}`, `Could not save: ${message}`));
    },
  });

  const numberField = (
    label: string,
    value: string,
    set: (v: string) => void,
    hint?: "rooms" | "capacity",
    max = 500,
  ) => (
    <label className="block">
      <span className="label-text">{label}</span>
      <input
        className="field w-full bg-card"
        type="number"
        inputMode="numeric"
        min={1}
        max={max}
        step={1}
        aria-invalid={!countOk(value, max)}
        value={value}
        onChange={(e) => set(e.target.value)}
      />
      {!countOk(value, max) && (
        <span className="mt-1 block text-[16px] font-semibold text-warn-foreground">
          {countHint(max, t)}
        </span>
      )}
      {hint && <CottageFieldHint field={hint} />}
    </label>
  );

  return (
    <div className="mt-3 space-y-3">
      <label className="block">
        <span className="label-text">{t("Adresa", "Address")}</span>
        <input
          className="field w-full bg-card"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />
        <CottageFieldHint field="address" />
      </label>
      <label className="block">
        <span className="label-text">{t("Město", "City")}</span>
        <input
          className="field w-full bg-card"
          value={city}
          onChange={(e) => setCity(e.target.value)}
        />
      </label>
      {numberField(
        t("Kapacita (kolik lidí se vejde)", "Capacity (how many people fit)"),
        capacity,
        setCapacity,
        "capacity",
      )}
      {numberField(t("Počet pokojů", "Number of rooms"), rooms, setRooms, "rooms", 200)}
      {numberField(t("Počet lůžek", "Number of beds"), beds, setBeds)}
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="label-text">{t("Příjezd od", "Arrival from")}</span>
          <input
            className="field w-full bg-card"
            type="time"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="label-text">{t("Odjezd do", "Leave by")}</span>
          <input
            className="field w-full bg-card"
            type="time"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </label>
      </div>
      <div>
        <p className="label-text">{t("Zvířata", "Pets")}</p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              [true, t("Povolena", "Allowed")],
              [false, t("Ne", "Not allowed")],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={String(value)}
              type="button"
              variant="fresh"
              size="fresh"
              aria-pressed={pets === value}
              className={`btn-secondary bg-card ${pets === value ? "ring-2 ring-primary" : ""}`}
              onClick={() => setPets(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <p className="text-[16px] text-muted-foreground">
        {t("Prázdné pole ponechá dosavadní údaj.", "An empty field keeps what was there before.")}
      </p>
      {badTime && (
        <p role="alert" className="text-[16px] font-semibold text-destructive">
          {t("Čas napište jako 15:00.", "Write the time like 15:00.")}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          variant="fresh"
          size="fresh"
          className="btn-primary flex-1"
          disabled={save.isPending || badTime || badNumber}
          onClick={() => save.mutate()}
        >
          {save.isPending ? t("Ukládám…", "Saving…") : t("Uložit", "Save")}
        </Button>
        <Button variant="fresh" size="fresh" className="btn-secondary bg-card" onClick={onDone}>
          {t("Zrušit", "Cancel")}
        </Button>
      </div>
    </div>
  );
}
