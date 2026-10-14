import { Button } from "@/components/ui/button";
import { useBrand } from "@/lib/brand";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpen, Flag } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, LoadingCards } from "@/components/bits";
import { LanguageToggle, useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/verejne/manual/$token")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Manuál chaty — My Chata" },
      { name: "description", content: "Veřejné pokyny a návody k chatě v češtině a angličtině." },
      { property: "og:title", content: "Manuál chaty — My Chata" },
      {
        property: "og:description",
        content: "Veřejné pokyny a návody k chatě v češtině a angličtině.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicManual,
});

function PublicManual() {
  const { token } = Route.useParams();
  const { t, lang } = useLang();
  // Addressed by the property's share token; only PUBLIC sections come back (migration 0012).
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-manual", token],
    queryFn: async () => {
      const [{ data: property, error: pErr }, { data: sections, error }] = await Promise.all([
        supabase.rpc("public_property", { _token: token }),
        supabase.rpc("public_manual", { _token: token }),
      ]);
      if (pErr) throw pErr;
      if (error) throw error;
      return { property: property?.[0] ?? null, sections: sections ?? [] };
    },
  });
  useBrand(data?.property?.is_institution ? "institution" : "family");
  const flag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("public_flag_manual_section", {
        _token: token,
        _section_id: id,
      });
      if (error) throw error;
    },
    onSuccess: () =>
      toast.success(
        t("Děkujeme, správce dostal upozornění.", "Thank you, the manager has been notified."),
      ),
    onError: () =>
      toast.error(
        t(
          "Upozornění se nepodařilo odeslat. Zkuste to prosím znovu.",
          "The note could not be sent. Please try again.",
        ),
      ),
  });
  return (
    <main className="mx-auto min-h-screen max-w-[420px] page-fresh px-5 py-6 text-foreground md:max-w-[720px] md:py-10">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-[16px] font-bold text-primary">My Chata</p>
          <h1 className="text-3xl font-bold">
            {data?.property?.property_name ?? t("Manuál chaty", "House Manual")}
          </h1>
        </div>
        <LanguageToggle />
      </header>
      {isLoading ? (
        <LoadingCards />
      ) : isError ? (
        <p role="alert" className="text-destructive">
          {t(
            "Manuál se nepodařilo načíst. Zkuste stránku obnovit.",
            "The manual could not be loaded. Try refreshing the page.",
          )}
        </p>
      ) : !data?.sections?.length ? (
        <EmptyState
          icon={BookOpen}
          title={t("Veřejný manuál není k dispozici.", "The public manual is unavailable.")}
        />
      ) : (
        <div className="space-y-3">
          {data.sections.map((section) => (
            <article key={section.id} className="card p-4">
              <p className="text-[16px] font-bold text-muted-foreground">{section.category}</p>
              <h2 className="text-xl font-bold">
                {lang === "en" ? section.title_en : section.title_cs}
              </h2>
              <p className="mt-2 whitespace-pre-wrap">
                {lang === "en" ? section.content_en : section.content_cs}
              </p>
              <Button
                variant="fresh"
                size="fresh"
                onClick={() => flag.mutate(section.id)}
                className="mt-4 flex min-h-11 items-center gap-2 text-[16px] font-bold text-muted-foreground"
              >
                <Flag className="size-4" />
                {t("Nahlásit neaktuální", "Flag as outdated")}
              </Button>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
