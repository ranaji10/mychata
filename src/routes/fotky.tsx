import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus, Star, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/fotky")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Photos — My Chata" }, { name: "robots", content: "noindex" }] }),
  component: PhotosPage,
});

interface PropertyPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  is_primary: boolean;
  uploaded_by_member_id: string | null;
}

function PhotosPage() {
  const { t } = useLang();
  const { property, currentMember } = useAccount();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const { data: photos } = useQuery({
    queryKey: ["property-photos", property?.id],
    enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase.from("property_photos").select("*").eq("property_id", property!.id).order("created_at");
      if (error) throw error;
      return data as PropertyPhoto[];
    },
  });

  const upload = async (file: File) => {
    if (!property || !currentMember) return;
    setBusy(true);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${property.id}/photos/${crypto.randomUUID()}-${safeName}`;
      const { error: upError } = await supabase.storage.from("my-chata-files").upload(path, file);
      if (upError) throw upError;
      const { data: signed } = await supabase.storage.from("my-chata-files").createSignedUrl(path, 60 * 60 * 24 * 365);
      const { error } = await supabase.from("property_photos").insert({
        property_id: property.id,
        photo_url: path,
        is_primary: !photos?.length,
        uploaded_by_member_id: currentMember.id,
      });
      if (error) throw error;
      void signed;
      queryClient.invalidateQueries({ queryKey: ["property-photos"] });
      toast.success(t("Fotka přidána.", "Photo added."));
    } catch {
      toast.error(t("Nahrání se nepodařilo.", "Upload failed."));
    } finally {
      setBusy(false);
    }
  };

  const makePrimary = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("property_photos").update({ is_primary: false }).eq("property_id", property!.id);
      const { error } = await supabase.from("property_photos").update({ is_primary: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-photos"] });
      toast.success(t("Hlavní fotka nastavena.", "Main photo set."));
    },
  });

  const remove = useMutation({
    mutationFn: async (photo: PropertyPhoto) => {
      const { error } = await supabase.from("property_photos").delete().eq("id", photo.id);
      if (error) throw error;
      await supabase.storage.from("my-chata-files").remove([photo.photo_url]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["property-photos"] }),
  });

  const { data: urls } = useQuery({
    queryKey: ["property-photo-urls", property?.id, photos?.map((p) => p.id).join(",")],
    enabled: !!photos?.length,
    queryFn: async () => {
      const map = new Map<string, string>();
      for (const p of photos!) {
        const { data } = await supabase.storage.from("my-chata-files").createSignedUrl(p.photo_url, 3600);
        if (data?.signedUrl) map.set(p.id, data.signedUrl);
      }
      return map;
    },
  });

  return (
    <AppShell>
      <PageHeader title={t("Fotky chaty", "Cottage photos")} subtitle={property?.name ?? ""} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      <button className="btn-primary mt-4 w-full" disabled={busy} onClick={() => fileRef.current?.click()}>
        <ImagePlus className="size-5" />
        {busy ? t("Nahrávám…", "Uploading…") : t("Přidat fotku", "Add a photo")}
      </button>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {photos?.map((p) => (
          <figure key={p.id} className={`card overflow-hidden ${p.is_primary ? "ring-2 ring-primary" : ""}`}>
            {urls?.get(p.id) ? <img src={urls.get(p.id)} alt={p.caption ?? ""} className="aspect-square w-full object-cover" /> : <div className="aspect-square w-full bg-secondary" />}
            <figcaption className="flex items-center justify-between p-2">
              <button className="btn-icon" aria-label={t("Nastavit jako hlavní", "Set as main")} onClick={() => makePrimary.mutate(p.id)}>
                <Star className={`size-5 ${p.is_primary ? "fill-primary text-primary" : ""}`} />
              </button>
              <button className="btn-icon" aria-label={t("Smazat", "Delete")} onClick={() => remove.mutate(p)}>
                <Trash2 className="size-5" />
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
      {!photos?.length && <p className="mt-6 text-center text-muted-foreground">{t("Zatím žádné fotky. Přidejte první!", "No photos yet. Add the first one!")}</p>}
      <p className="mt-4 text-center text-[13px] text-muted-foreground">{t("Hvězdičkou vyberete hlavní fotku chaty.", "Use the star to pick the cottage's main photo.")}</p>
    </AppShell>
  );
}
