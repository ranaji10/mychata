import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { BookOpen, Flag } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, LoadingCards } from "@/components/bits";
import { LanguageToggle, useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/verejne/manual/$propertyId")({
  head: () => ({ meta: [
    { title: "Public House Manual — My Chata" }, { name: "description", content: "Public bilingual cottage instructions." },
    { property: "og:title", content: "Public House Manual — My Chata" }, { property: "og:description", content: "Public bilingual cottage instructions." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }), component: PublicManual,
});

function PublicManual() {
  const { propertyId } = Route.useParams(); const { t, lang } = useLang();
  const { data, isLoading } = useQuery({ queryKey: ["public-manual", propertyId], queryFn: async () => {
    const [{ data: property }, { data: sections, error }] = await Promise.all([
      supabase.from("properties").select("name,address").eq("id", propertyId).single(),
      supabase.from("manual_sections").select("*").eq("property_id", propertyId).eq("visibility", "PUBLIC").order("display_order"),
    ]); if (error) throw error; return { property, sections };
  }});
  const flag = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from("manual_feedback").insert({ section_id: id }); if (error) throw error; }, onSuccess: () => toast.success(t("Děkujeme, správce dostal upozornění.", "Thank you, the manager has been notified.")) });
  return <main className="mx-auto min-h-screen max-w-[400px] bg-background px-4 py-6 text-foreground"><header className="mb-5 flex items-start justify-between gap-3"><div><p className="text-[13px] font-bold uppercase text-primary">My Chata</p><h1 className="text-3xl font-bold">{data?.property?.name ?? t("Manuál chaty", "House Manual")}</h1><p className="text-[14px] text-muted-foreground">{data?.property?.address}</p></div><LanguageToggle /></header>
    {isLoading ? <LoadingCards /> : !data?.sections?.length ? <EmptyState icon={BookOpen} title={t("Veřejný manuál není k dispozici.", "The public manual is unavailable.")} /> : <div className="space-y-3">{data.sections.map((section) => <article key={section.id} className="card p-4"><p className="text-[13px] font-bold uppercase text-muted-foreground">{section.category}</p><h2 className="text-xl font-bold">{lang === "en" ? section.title_en : section.title_cs}</h2><p className="mt-2 whitespace-pre-wrap">{lang === "en" ? section.content_en : section.content_cs}</p><button onClick={() => flag.mutate(section.id)} className="mt-4 flex min-h-11 items-center gap-2 text-[14px] font-bold text-muted-foreground"><Flag className="size-4" />{t("Nahlásit neaktuální", "Flag as outdated")}</button></article>)}</div>}
  </main>;
}