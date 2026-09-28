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
import { classifyUploadError, preparePhoto, uploadErrorMessage } from "@/lib/photos";

export const Route = createFileRoute("/fotky")({
  staticData: { sitemap: false },
  head: () => ({ meta: [{ title: "Photos — My Chata" }, { name: "robots", content: "noindex" }] }),
  component: PhotosPage,
});

interface PropertyPhoto {
  id: string;
  storage_path: string;
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
      const { data, error } = await supabase
        .from("property_photos")
        .select("*")
        .eq("property_id", property!.id)
        .order("created_at");
      if (error) throw error;
      return data as PropertyPhoto[];
    },
  });

  const upload = async (file: File) => {
    if (!property || !currentMember) return;
    setBusy(true);
    try {
      const photo = await preparePhoto(file);
      const safeName = photo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${property.id}/photos/${crypto.randomUUID()}-${safeName}`;
      const { error: upError } = await supabase.storage
        .from("my-chata-files")
        .upload(path, photo, { contentType: photo.type });
      if (upError) throw upError;
      const { error } = await supabase.from("property_photos").insert({
        property_id: property.id,
        storage_path: path,
        is_primary: !photos?.length,
        uploaded_by_member_id: currentMember.id,
      });
      if (error) {
        // Don't leave an orphan file behind when the row is refused.
        const { error: cleanupError } = await supabase.storage
          .from("my-chata-files")
          .remove([path]);
        if (cleanupError) console.error("[fotky] cleanup", cleanupError);
        throw error;
      }
      queryClient.invalidateQueries({ queryKey: ["property-photos"] });
      toast.success(t("Fotka přidána.", "Photo added."));
    } catch (error) {
      console.error("[fotky] upload", error);
      const online = typeof navigator === "undefined" || navigator.onLine;
      toast.error(
        uploadErrorMessage(
          classifyUploadError(error, online),
          t,
          (error as { message?: string } | null)?.message ?? String(error),
        ),
      );
    } finally {
      setBusy(false);
      // Lets the same file be picked again after a failure.
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const makePrimary = useMutation({
    mutationFn: async (id: string) => {
      // Only one main photo is allowed (unique index), so clear the old one first.
      const { error: clearError } = await supabase
        .from("property_photos")
        .update({ is_primary: false })
        .eq("property_id", property!.id);
      if (clearError) throw clearError;
      const { error } = await supabase
        .from("property_photos")
        .update({ is_primary: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property-photos"] });
      toast.success(t("Hlavní fotka nastavena.", "Main photo set."));
    },
    onError: (error) => {
      console.error("[fotky] makePrimary", error);
      queryClient.invalidateQueries({ queryKey: ["property-photos"] });
      toast.error(
        t(
          `Hlavní fotku se nepodařilo nastavit: ${error.message}`,
          `Could not set the main photo: ${error.message}`,
        ),
      );
    },
  });

  const remove = useMutation({
    mutationFn: async (photo: PropertyPhoto) => {
      const { error } = await supabase.from("property_photos").delete().eq("id", photo.id);
      if (error) throw error;
      const { error: fileError } = await supabase.storage
        .from("my-chata-files")
        .remove([photo.storage_path]);
      // The photo is gone from the app; a leftover file is only logged.
      if (fileError) console.error("[fotky] remove file", fileError);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["property-photos"] }),
    onError: (error) => {
      console.error("[fotky] remove", error);
      toast.error(
        t(
          `Fotku se nepodařilo smazat: ${error.message}`,
          `Could not delete the photo: ${error.message}`,
        ),
      );
    },
  });

  const { data: urls } = useQuery({
    queryKey: ["property-photo-urls", property?.id, photos?.map((p) => p.id).join(",")],
    enabled: !!photos?.length,
    queryFn: async () => {
      const map = new Map<string, string>();
      for (const p of photos!) {
        const { data, error } = await supabase.storage
          .from("my-chata-files")
          .createSignedUrl(p.storage_path, 3600);
        if (error) console.error("[fotky] signed url", p.storage_path, error);
        if (data?.signedUrl) map.set(p.id, data.signedUrl);
      }
      return map;
    },
  });

  return (
    <AppShell>
      <PageHeader title={t("Fotky chaty", "Cottage photos")} subtitle={property?.name ?? ""} />
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <button
        className="btn-primary mt-4 w-full"
        disabled={busy}
        onClick={() => fileRef.current?.click()}
      >
        <ImagePlus className="size-5" />
        {busy ? t("Nahrávám…", "Uploading…") : t("Přidat fotku", "Add a photo")}
      </button>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {photos?.map((p) => (
          <figure
            key={p.id}
            className={`card overflow-hidden ${p.is_primary ? "ring-2 ring-primary" : ""}`}
          >
            {urls?.get(p.id) ? (
              <img src={urls.get(p.id)} alt="" className="aspect-square w-full object-cover" />
            ) : (
              <div className="aspect-square w-full bg-secondary" />
            )}
            <figcaption className="flex items-center justify-between p-2">
              <button
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary"
                aria-label={t("Nastavit jako hlavní", "Set as main")}
                onClick={() => makePrimary.mutate(p.id)}
              >
                <Star className={`size-5 ${p.is_primary ? "fill-primary text-primary" : ""}`} />
              </button>
              <button
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary"
                aria-label={t("Smazat", "Delete")}
                onClick={() => remove.mutate(p)}
              >
                <Trash2 className="size-5" />
              </button>
            </figcaption>
          </figure>
        ))}
      </div>
      {!photos?.length && (
        <p className="mt-6 text-center text-muted-foreground">
          {t("Zatím žádné fotky. Přidejte první!", "No photos yet. Add the first one!")}
        </p>
      )}
      <p className="mt-4 text-center text-[13px] text-muted-foreground">
        {t(
          "Hvězdičkou vyberete hlavní fotku chaty.",
          "Use the star to pick the cottage's main photo.",
        )}
      </p>
    </AppShell>
  );
}
