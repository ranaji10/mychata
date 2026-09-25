import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/chata/nova")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Add cottage — My Chata" }, { name: "robots", content: "noindex" }] }),
  component: AddPropertyPage,
});

function AddPropertyPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setActivePropertyId } = useAccount();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [rooms, setRooms] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc("add_property", {
      _name: name.trim(),
      _address: address.trim(),
      ...(city.trim() ? { _city: city.trim() } : {}),
      ...(rooms ? { _rooms: Number(rooms) } : {}),
    });
    setBusy(false);
    if (error) {
      toast.error(t("Přidání se nepodařilo.", "Could not add the cottage."));
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["properties"] });
    if (data) setActivePropertyId(data as string);
    toast.success(t("Chata přidána — jste jejím správcem.", "Cottage added — you are its admin."));
    navigate({ to: "/domu" });
  };

  return (
    <AppShell>
      <PageHeader title={t("Přidat chatu", "Add a cottage")} subtitle={t("Kdo chatu přidá, stává se jejím správcem.", "Whoever adds a cottage becomes its admin.")} />
      <div className="card mt-4 space-y-3 p-4">
        <input className="field w-full" placeholder={t("Název chaty", "Cottage name")} value={name} onChange={(e) => setName(e.target.value)} />
        <input className="field w-full" placeholder={t("Adresa", "Address")} value={address} onChange={(e) => setAddress(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <input className="field" placeholder={t("Město", "City")} value={city} onChange={(e) => setCity(e.target.value)} />
          <input className="field" type="number" min={1} placeholder={t("Pokoje", "Rooms")} value={rooms} onChange={(e) => setRooms(e.target.value)} />
        </div>
        <button className="btn-primary w-full" disabled={busy || name.trim().length < 2 || address.trim().length < 2} onClick={save}>
          {busy ? t("Ukládám…", "Saving…") : t("Přidat chatu", "Add cottage")}
        </button>
      </div>
    </AppShell>
  );
}
