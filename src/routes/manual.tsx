import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Check, Copy, Flag, Plus } from "lucide-react";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { EmptyState, LoadingCards, PageHeader, PillNeutral } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/manual")({
  staticData: { sitemap: false },
  head: () => ({ meta: [
    { title: "House Manual — My Chata" },
    { name: "description", content: "Bilingual instructions and house information for your cottage." },
    { property: "og:title", content: "House Manual — My Chata" },
    { property: "og:description", content: "Bilingual instructions and house information for your cottage." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ManualPage,
});

const categories = ["wifi", "heating", "water", "waste", "emergency", "rules", "other"];

function ManualPage() {
  const { property, currentMember } = useAccount();
  const { t, lang } = useLang();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ titleCs: "", titleEn: "", contentCs: "", contentEn: "", category: "other", visibility: "PUBLIC" });
  const isAdmin = currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";
  const publicUrl = property ? `${typeof window === "undefined" ? "" : window.location.origin}/verejne/manual/${property.id}` : "";

  const { data: sections, isLoading } = useQuery({
    queryKey: ["manual-sections", property?.id], enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase.from("manual_sections").select("*").eq("property_id", property?.id ?? "").order("display_order");
      if (error) throw error;
      return data;
    },
  });
  const { data: feedback } = useQuery({ queryKey: ["manual-feedback", property?.id, sections?.length], enabled: !!property && isAdmin && !!sections, queryFn: async () => {
    const ids = (sections ?? []).map((section) => section.id); if (!ids.length) return [];
    const { data, error } = await supabase.from("manual_feedback").select("*").in("section_id", ids).eq("status", "OPEN").order("created_at"); if (error) throw error; return data;
  }});
  const resolveFeedback = useMutation({ mutationFn: async (id: string) => { const { error } = await supabase.from("manual_feedback").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id); if (error) throw error; }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["manual-feedback", property?.id] }); toast.success(t("Upozornění vyřešeno.", "Report resolved.")); } });

  const addSection = useMutation({
    mutationFn: async () => {
      if (!property) return;
      const { error } = await supabase.from("manual_sections").insert({
        property_id: property.id, category: form.category, title_cs: form.titleCs, title_en: form.titleEn,
        content_cs: form.contentCs, content_en: form.contentEn, visibility: form.visibility,
        display_order: sections?.length ?? 0,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["manual-sections", property?.id] }); setEditing(false); setForm({ titleCs: "", titleEn: "", contentCs: "", contentEn: "", category: "other", visibility: "PUBLIC" }); toast.success(t("Sekce přidána.", "Section added.")); },
    onError: () => toast.error(t("Sekci se nepodařilo přidat.", "Could not add the section.")),
  });

  return <AppShell>
    <PageHeader title={t("Manuál chaty", "House Manual")} subtitle={property?.name} back="/vice" action={isAdmin ? <button onClick={() => setEditing(true)} aria-label={t("Přidat sekci", "Add section")} className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground"><Plus className="size-5" /></button> : null} />

    {property && <section className="card mb-4 flex items-center gap-4 p-4">
      <div className="rounded-xl bg-card p-1 ring-1 ring-border"><QRCodeSVG value={publicUrl} size={82} /></div>
      <div className="min-w-0 flex-1"><p className="font-bold">{t("Veřejný manuál", "Public manual")}</p><p className="text-[13px] text-muted-foreground">{t("Hosté jej otevřou bez přihlášení.", "Guests can open it without signing in.")}</p></div>
      <button onClick={async () => { await navigator.clipboard.writeText(publicUrl); toast.success(t("Odkaz zkopírován.", "Link copied.")); }} aria-label={t("Kopírovat odkaz", "Copy link")} className="grid size-11 place-items-center rounded-xl bg-secondary"><Copy className="size-5" /></button>
    </section>}
    {isAdmin && !!feedback?.length && <section className="mb-4 rounded-2xl bg-warn-soft p-4"><div className="flex items-center gap-2"><Flag className="size-5 text-warn" /><h2 className="font-bold">{t("Nahlášené neaktuální informace", "Outdated information reports")}</h2></div><div className="mt-3 space-y-2">{feedback.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl bg-card p-3"><p className="flex-1 text-[14px] font-semibold">{sections?.find((section) => section.id === item.section_id)?.[lang === "en" ? "title_en" : "title_cs"]}</p><button onClick={() => resolveFeedback.mutate(item.id)} className="grid size-11 place-items-center rounded-xl bg-ok-soft text-ok" aria-label={t("Označit jako vyřešené", "Mark resolved")}><Check className="size-5" /></button></div>)}</div></section>}

    {isLoading ? <LoadingCards /> : !sections?.length ? <EmptyState icon={BookOpen} title={t("Manuál je zatím prázdný.", "The manual is empty.")} /> : <div className="space-y-3">{sections.map((section) => <article key={section.id} className="card p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[13px] font-bold uppercase text-muted-foreground">{section.category}</p><h2 className="text-lg font-bold">{lang === "en" ? section.title_en : section.title_cs}</h2></div><PillNeutral>{section.visibility === "PUBLIC" ? t("Veřejné", "Public") : t("Jen členové", "Members only")}</PillNeutral></div>
      <p className="mt-2 whitespace-pre-wrap text-[15px]">{lang === "en" ? section.content_en : section.content_cs}</p>
    </article>)}</div>}

    {editing && <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/35 p-4 sm:place-items-center"><form onSubmit={(event) => { event.preventDefault(); addSection.mutate(); }} className="card max-h-[90vh] w-full max-w-[400px] space-y-3 overflow-auto p-4">
      <h2 className="text-xl font-bold">{t("Nová sekce", "New section")}</h2>
      <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="field">{categories.map((category) => <option key={category}>{category}</option>)}</select>
      <input required value={form.titleCs} onChange={(e) => setForm({ ...form, titleCs: e.target.value })} className="field" placeholder="Název česky" />
      <textarea required value={form.contentCs} onChange={(e) => setForm({ ...form, contentCs: e.target.value })} className="field min-h-24" placeholder="Obsah česky" />
      <input required value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} className="field" placeholder="English title" />
      <textarea required value={form.contentEn} onChange={(e) => setForm({ ...form, contentEn: e.target.value })} className="field min-h-24" placeholder="English content" />
      <select value={form.visibility} onChange={(e) => setForm({ ...form, visibility: e.target.value })} className="field"><option value="PUBLIC">{t("Veřejné", "Public")}</option><option value="MEMBERS_ONLY">{t("Jen členové", "Members only")}</option></select>
      <div className="flex gap-2"><button className="btn-primary flex-1">{t("Uložit", "Save")}</button><button type="button" onClick={() => setEditing(false)} className="btn-secondary">{t("Zrušit", "Cancel")}</button></div>
    </form></div>}
  </AppShell>;
}