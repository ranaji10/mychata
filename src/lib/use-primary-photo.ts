import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * A signed URL for the chata's main photo (property_photos.is_primary), or null.
 * Home used to show only the built-in stock picture, so choosing a main photo changed
 * nothing visible (B-015). Invalidate ["primary-photo"] after a photo change.
 */
export function usePrimaryPhotoUrl(propertyId: string | null | undefined) {
  return useQuery({
    queryKey: ["primary-photo", propertyId],
    enabled: !!propertyId,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("property_photos")
        .select("storage_path")
        .eq("property_id", propertyId!)
        .eq("is_primary", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: signed, error: signError } = await supabase.storage
        .from("my-chata-files")
        .createSignedUrl(data.storage_path, 60 * 60);
      if (signError) {
        console.error("[photos] primary signed url", signError);
        return null;
      }
      return signed.signedUrl;
    },
  });
}
