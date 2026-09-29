import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { AskBox } from "@/components/AskBox";
import {
  EmptyState,
  LoadingCards,
  PageHeader,
  PillDanger,
  PillNeutral,
  PillWarn,
} from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { fmtDate, todayISO } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { readDocumentText } from "@/lib/manual-qa.functions";

export const Route = createFileRoute("/dokumenty")({
  staticData: { sitemap: false },
  validateSearch: (search: Record<string, unknown>) => ({
    task: typeof search["task"] === "string" ? search["task"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Document Vault — My Chata" },
      {
        name: "description",
        content: "Private cottage documents, warranties, and expiry reminders.",
      },
      { property: "og:title", content: "Document Vault — My Chata" },
      {
        property: "og:description",
        content: "Private cottage documents, warranties, and expiry reminders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DocumentsPage,
});

const categories = [
  "INSURANCE",
  "OWNERSHIP",
  "UTILITIES",
  "SERVICE_RECORDS",
  "WARRANTIES",
  "OTHER",
];

function DocumentsPage() {
  const { task: linkedTaskId } = Route.useSearch();
  const { property, currentMember } = useAccount();
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [adding, setAdding] = useState(!!linkedTaskId);
  const [form, setForm] = useState({
    title: "",
    category: linkedTaskId ? "WARRANTIES" : "OTHER",
    notes: "",
    issueDate: "",
    expiryDate: "",
    visibility: "ALL_MEMBERS",
  });
  const [file, setFile] = useState<File | null>(null);
  const isAdmin = currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";
  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents", property?.id],
    enabled: !!property,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("property_id", property?.id ?? "")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const visible = useMemo(
    () =>
      (documents ?? []).filter(
        (document) =>
          (category === "ALL" || document.category === category) &&
          `${document.title} ${document.notes ?? ""}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [documents, category, query],
  );
  const save = useMutation({
    mutationFn: async () => {
      if (!property) return;
      let fileUrl: string | null = null;
      if (file) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `${property.id}/${crypto.randomUUID()}-${safeName}`;
        const { error } = await supabase.storage.from("my-chata-files").upload(path, file);
        if (error) throw error;
        fileUrl = path;
      }
      const { data: inserted, error } = await supabase.from("documents").insert({
        property_id: property.id,
        linked_task_id: linkedTaskId || null,
        title: form.title,
        category: form.category,
        notes: form.notes || null,
        issue_date: form.issueDate || null,
        expiry_date: form.expiryDate || null,
        visibility: form.visibility,
        file_url: fileUrl,
        text_status: fileUrl ? "pending" : "no_file",
      })
        .select("id")
        .single();
      if (error) throw error;
      return fileUrl ? inserted.id : null;
    },
    onSuccess: (documentId) => {
      queryClient.invalidateQueries({ queryKey: ["documents", property?.id] });
      // Read the file right away so questions can use it (T-021).
      if (documentId) readText.mutate(documentId);
      setAdding(false);
      setFile(null);
      setForm({
        title: "",
        category: "OTHER",
        notes: "",
        issueDate: "",
        expiryDate: "",
        visibility: "ALL_MEMBERS",
      });
      toast.success(t("Dokument uložen.", "Document saved."));
    },
    onError: () =>
      toast.error(
        t(
          "Dokument se nepodařilo uložit. Přihlaste se a zkuste to znovu.",
          "Could not save the document. Sign in and try again.",
        ),
      ),
  });
  const [reading, setReading] = useState<string | null>(null);
  const readText = useMutation({
    mutationFn: async (documentId: string) => {
      setReading(documentId);
      return readDocumentText({ data: { documentId } });
    },
    onSettled: () => {
      setReading(null);
      void queryClient.invalidateQueries({ queryKey: ["documents", property?.id] });
    },
    onSuccess: (r) => {
      if (r.status === "ready") toast.success(t("Dokument je připravený pro otázky.", "The document is ready for questions."));
      else if (r.status === "limit")
        toast.error(t("Dnešní limit čtení dokumentů je vyčerpán.", "Today's document reading limit is reached."));
      else if (r.status === "disabled")
        toast.error(t("Čtení dokumentů pomocí AI je vypnuté.", "Reading documents with AI is switched off."));
      else if (r.status === "failed")
        toast.error(
          t(`Text dokumentu se nepodařilo přečíst: ${"error" in r ? r.error : ""}`, `Couldn't read the document's text: ${"error" in r ? r.error : ""}`),
        );
      else if (r.status === "not_allowed")
        toast.error(t("Text může uložit jen správce.", "Only an admin can store the text."));
    },
    onError: (e) => {
      console.error("[dokumenty] read text", e);
      toast.error(t(`Čtení se nepodařilo: ${e.message}`, `Reading failed: ${e.message}`));
    },
  });

  const openFile = async (path: string | null) => {
    if (!path) return;
    const { data, error } = await supabase.storage.from("my-chata-files").createSignedUrl(path, 60);
    if (error) {
      toast.error(t("Soubor nelze otevřít.", "Could not open the file."));
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  const remove = async (id: string, path: string | null) => {
    if (path) await supabase.storage.from("my-chata-files").remove([path]);
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) {
      toast.error(t("Dokument nelze smazat.", "Could not delete the document."));
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["documents", property?.id] });
  };
  const daysUntil = (date: string) =>
    Math.ceil(
      (new Date(`${date}T00:00:00`).getTime() - new Date(`${todayISO()}T00:00:00`).getTime()) /
        86400000,
    );
  return (
    <AppShell>
      <PageHeader
        title={t("Dokumenty", "Document Vault")}
        subtitle={t(
          "Smlouvy, záruky a servisní záznamy",
          "Contracts, warranties, and service records",
        )}
        back="/vice"
        action={
          isAdmin ? (
            <button
              onClick={() => setAdding(true)}
              className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground"
              aria-label={t("Přidat dokument", "Add document")}
            >
              <Plus className="size-5" />
            </button>
          ) : null
        }
      />
      <AskBox
        propertyId={property?.id}
        title={t("Zeptejte se dokumentů a manuálu", "Ask the documents and manual")}
        placeholder={t("Např. Do kdy platí záruka na čerpadlo?", "E.g. When does the pump warranty end?")}
      />
      <div className="mb-4 flex gap-2">
        <label className="field flex items-center gap-2">
          <Search className="size-5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent outline-none"
            placeholder={t("Filtrovat podle názvu", "Filter by title")}
          />
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="field w-36"
        >
          <option value="ALL">{t("Vše", "All")}</option>
          {categories.map((value) => (
            <option key={value}>{value}</option>
          ))}
        </select>
      </div>
      {isLoading ? (
        <LoadingCards />
      ) : !visible.length ? (
        <EmptyState icon={FileText} title={t("Žádné dokumenty.", "No documents.")} />
      ) : (
        <div className="space-y-3">
          {visible.map((document) => {
            const days = document.expiry_date ? daysUntil(document.expiry_date) : null;
            return (
              <article key={document.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary">
                    <FileText className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-bold">{document.title}</h2>
                    <p className="text-[13px] text-muted-foreground">{document.category}</p>
                  </div>
                  {days !== null && days < 0 ? (
                    <PillDanger>{t("Po platnosti", "Expired")}</PillDanger>
                  ) : days !== null && days <= 30 ? (
                    <PillWarn>
                      {days} {t("dní", "days")}
                    </PillWarn>
                  ) : (
                    <PillNeutral>
                      {document.visibility === "ADMINS_ONLY"
                        ? t("Správci", "Admins")
                        : t("Členové", "Members")}
                    </PillNeutral>
                  )}
                </div>
                {document.notes && <p className="mt-2 text-[14px]">{document.notes}</p>}
                {document.expiry_date && (
                  <p className="mt-2 text-[13px] font-semibold text-muted-foreground">
                    {t("Platnost do", "Expires")} {fmtDate(document.expiry_date)}
                  </p>
                )}
                {document.file_url && (
                  <p className="mt-2 flex items-center gap-2 text-[13px] font-semibold text-muted-foreground">
                    {reading === document.id ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        {t("Čtu text dokumentu…", "Reading the document…")}
                      </>
                    ) : document.text_status === "ready" ? (
                      <span className="text-ok">
                        {t("Připraveno pro otázky", "Ready for questions")}
                      </span>
                    ) : document.text_status === "failed" ? (
                      <span className="text-warn">
                        {t("Text se nepodařilo přečíst", "Couldn't read the text")}
                        {document.text_error ? ` (${document.text_error})` : ""}
                      </span>
                    ) : (
                      t("Zatím nepřečteno", "Not read yet")
                    )}
                    {isAdmin && document.text_status !== "ready" && reading !== document.id && (
                      <button
                        onClick={() => readText.mutate(document.id)}
                        disabled={readText.isPending}
                        className="inline-flex min-h-11 items-center gap-1 font-bold text-primary"
                      >
                        <RefreshCw className="size-4" />
                        {t("Přečíst", "Read now")}
                      </button>
                    )}
                  </p>
                )}
                <div className="mt-3 flex gap-2">
                  {document.file_url && (
                    <button
                      onClick={() => openFile(document.file_url)}
                      className="btn-secondary flex-1"
                    >
                      <Download className="size-4" />
                      {t("Otevřít", "Open")}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => remove(document.id, document.file_url)}
                      className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary"
                      aria-label={t("Smazat", "Delete")}
                    >
                      <Trash2 className="size-5" />
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {adding && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-foreground/35 p-4 sm:place-items-center">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="card max-h-[90vh] w-full max-w-[400px] space-y-3 overflow-auto p-4"
          >
            <h2 className="text-xl font-bold">
              {linkedTaskId
                ? t("Záruka k dokončenému úkolu", "Warranty for completed task")
                : t("Nový dokument", "New document")}
            </h2>
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="field"
              placeholder={t("Název", "Title")}
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="field"
            >
              {categories.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="field"
              placeholder={t("Poznámky", "Notes")}
            />
            <label className="block text-[13px] font-bold">
              {t("Datum vystavení", "Issue date")}
              <input
                type="date"
                value={form.issueDate}
                onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                className="field mt-1"
              />
            </label>
            <label className="block text-[13px] font-bold">
              {t("Platnost do", "Expiry date")}
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                className="field mt-1"
              />
            </label>
            <select
              value={form.visibility}
              onChange={(e) => setForm({ ...form, visibility: e.target.value })}
              className="field"
            >
              <option value="ALL_MEMBERS">{t("Všichni členové", "All members")}</option>
              <option value="ADMINS_ONLY">{t("Jen správci", "Admins only")}</option>
            </select>
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,.docx,.txt,.md,.csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="field"
            />
            <p className="text-[13px] text-muted-foreground">
              {t(
                "Text souboru (PDF, Word, fotka, text) se přečte, aby na něj šlo odpovídat v otázkách. Dokumenty jen pro správce vidí v odpovědích jen správci.",
                "The file's text (PDF, Word, photo, text) is read so questions can be answered from it. Admin-only documents appear in answers for admins only.",
              )}
            </p>
            <div className="flex gap-2">
              <button className="btn-primary flex-1" disabled={save.isPending}>
                {save.isPending ? t("Ukládám…", "Saving…") : t("Uložit", "Save")}
              </button>
              <button type="button" onClick={() => setAdding(false)} className="btn-secondary">
                {t("Zrušit", "Cancel")}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
