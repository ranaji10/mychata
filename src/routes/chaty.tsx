import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Building2, Camera, FileText, Home, Plus, ScrollText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/bits";
import { CottageSetup } from "@/components/CottageSetup";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import type { Property } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { rebuildManualChunks } from "@/lib/manual-qa.functions";

export const Route = createFileRoute("/chaty")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Manage cottages — My Chata" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Your cottages, their photos, house manual and documents." },
      { property: "og:title", content: "Manage cottages — My Chata" },
      {
        property: "og:description",
        content: "Your cottages, their photos, house manual and documents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ManageCottagesPage,
});

/**
 * Manage cottages (bug 7, 17 Oct 2026): every cottage in one list, which ones an organisation
 * manages, and per cottage the photos, house manual, house rules and documents that used to be
 * separate rows in Settings.
 */
function ManageCottagesPage() {
  const { t } = useLang();
  const navigate = useNavigate();
  const {
    account,
    accounts,
    memberships,
    properties,
    property,
    setActivePropertyId,
    switchAccount,
    currentMember,
  } = useAccount();
  const isAdmin = currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";
  const ids = properties.map((p) => p.id);
  const [switching, setSwitching] = useState<string | null>(null);

  const { data: rulesFor } = useQuery({
    queryKey: ["house-rules", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_sections")
        .select("property_id")
        .eq("category", "rules")
        .in("property_id", ids);
      if (error) throw error;
      return (data ?? []).map((r) => r.property_id);
    },
  });

  // Photos, manual and documents work on the cottage that is open, so open it first.
  const openFor = (p: Property, to: "/fotky" | "/manual" | "/dokumenty") => {
    if (p.id !== property?.id) setActivePropertyId(p.id);
    navigate({ to });
  };

  const switchTo = async (accountId: string) => {
    setSwitching(accountId);
    try {
      await switchAccount(accountId);
    } catch (error) {
      console.error("[chaty] switch", error);
      toast.error(t("Přepnutí se nepodařilo.", "Could not switch."));
    } finally {
      setSwitching(null);
    }
  };

  const others = memberships.filter((m) => m.account_id !== account?.id);

  return (
    <AppShell>
      <PageHeader title={t("Spravovat chaty", "Manage cottages")} back="/vice" />

      <section className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{account?.name}</h2>
          <TypeBadge institutional={account?.type === "INSTITUTIONAL"} />
        </div>
        <p className="mt-1 text-[16px] text-muted-foreground">
          {account?.type === "INSTITUTIONAL"
            ? t("Tyto chaty spravuje organizace.", "An organisation manages these cottages.")
            : t("Rodinné chaty.", "Family cottages.")}
        </p>
        <div className="mt-3 space-y-3">
          {properties.map((p) => (
            <CottageCard
              key={p.id}
              property={p}
              open={p.id === property?.id}
              hasRules={!!rulesFor?.includes(p.id)}
              isAdmin={isAdmin}
              onOpen={(to) => openFor(p, to)}
            />
          ))}
          {!properties.length && (
            <p className="text-[16px] text-muted-foreground">
              {t("Zatím žádná chata.", "No cottage yet.")}
            </p>
          )}
        </div>
        <Link to="/chata/nova" className="btn-secondary mt-4 w-full">
          <Plus className="size-5" /> {t("Přidat chatu", "Add a cottage")}
        </Link>
      </section>

      <CottageSetup />

      {others.length > 0 && (
        <section className="card mt-4 p-4">
          <h2 className="text-lg font-bold">{t("Další vaše účty", "Your other accounts")}</h2>
          <div className="mt-3 space-y-2">
            {others.map((m) => {
              const acc = accounts.find((a) => a.id === m.account_id);
              return (
                <div key={m.id} className="rounded-2xl bg-secondary p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="min-w-0 flex-1 truncate font-bold">{acc?.name ?? "—"}</p>
                    <TypeBadge institutional={acc?.type === "INSTITUTIONAL"} />
                  </div>
                  <Button
                    variant="fresh"
                    size="fresh"
                    className="btn-secondary mt-2 w-full bg-card"
                    disabled={!!switching}
                    onClick={() => void switchTo(m.account_id)}
                  >
                    {switching === m.account_id
                      ? t("Přepínám…", "Switching…")
                      : t("Otevřít a spravovat", "Open and manage")}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </AppShell>
  );
}

function TypeBadge({ institutional }: { institutional: boolean }) {
  const { t } = useLang();
  return institutional ? (
    <span className="pill bg-primary-soft text-primary">
      <Building2 className="size-3.5" /> {t("Spravuje organizace", "Managed by an institution")}
    </span>
  ) : (
    <span className="pill bg-secondary text-muted-foreground">
      <Home className="size-3.5" /> {t("Rodina", "Family")}
    </span>
  );
}

function CottageCard({
  property,
  open,
  hasRules,
  isAdmin,
  onOpen,
}: {
  property: Property;
  open: boolean;
  hasRules: boolean;
  isAdmin: boolean;
  onOpen: (to: "/fotky" | "/manual" | "/dokumenty") => void;
}) {
  const { t } = useLang();
  const queryClient = useQueryClient();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rules, setRules] = useState("");

  const saveRules = useMutation({
    mutationFn: async () => {
      const text = rules.trim();
      const { error } = await supabase.from("manual_sections").insert({
        property_id: property.id,
        category: "rules",
        title_cs: "Pravidla domu",
        title_en: "House rules",
        content_cs: text,
        content_en: text,
        visibility: "PUBLIC",
        display_order: 0,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      setRulesOpen(false);
      setRules("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["house-rules"] }),
        queryClient.invalidateQueries({ queryKey: ["manual-sections", property.id] }),
      ]);
      void rebuildManualChunks({ data: { propertyId: property.id } }).catch((e: unknown) =>
        console.error("[chaty] manual chunks", e),
      );
      toast.success(t("Pravidla domu uložena.", "House rules saved."));
    },
    onError: (error) => {
      console.error("[chaty] rules", error);
      toast.error(t(`Uložení se nepodařilo: ${error.message}`, `Could not save: ${error.message}`));
    },
  });

  const action =
    "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl bg-card py-1 text-[15px] font-bold";
  return (
    <div className="rounded-2xl bg-secondary p-3">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-[17px] font-bold">{property.name}</p>
        {open && (
          <span className="pill bg-card text-muted-foreground">{t("Otevřená", "Open")}</span>
        )}
      </div>
      {(property.address || property.city) && (
        <p className="truncate text-[16px] text-muted-foreground">
          {[property.address, property.city].filter(Boolean).join(", ")}
        </p>
      )}
      <div className="mt-2 grid grid-cols-3 gap-2">
        <Button variant="fresh" size="fresh" className={action} onClick={() => onOpen("/fotky")}>
          <Camera className="size-5" />
          {t("Fotky", "Photos")}
        </Button>
        <Button variant="fresh" size="fresh" className={action} onClick={() => onOpen("/manual")}>
          <BookOpen className="size-5" />
          {t("Manuál", "Manual")}
        </Button>
        <Button
          variant="fresh"
          size="fresh"
          className={action}
          onClick={() => onOpen("/dokumenty")}
        >
          <FileText className="size-5" />
          {t("Dokumenty", "Documents")}
        </Button>
      </div>
      <div className="mt-2 flex items-center gap-2 text-[16px]">
        <ScrollText className="size-5 shrink-0 text-muted-foreground" />
        <span className="flex-1">
          {hasRules
            ? t("Pravidla domu jsou v manuálu.", "House rules are in the manual.")
            : t("Pravidla domu zatím nejsou.", "No house rules yet.")}
        </span>
        {!hasRules && isAdmin && !rulesOpen && (
          <Button
            variant="fresh"
            size="fresh"
            className="min-h-11 px-2 font-bold text-primary"
            onClick={() => setRulesOpen(true)}
          >
            {t("Přidat", "Add")}
          </Button>
        )}
      </div>
      {rulesOpen && (
        <div className="mt-2 space-y-2">
          <textarea
            className="field min-h-24 w-full"
            placeholder={t(
              "Pravidla domu, např. tichá noc od 22:00…",
              "House rules, e.g. quiet hours after 10 pm…",
            )}
            value={rules}
            onChange={(e) => setRules(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              variant="fresh"
              size="fresh"
              className="btn-primary flex-1"
              disabled={saveRules.isPending || rules.trim().length < 2}
              onClick={() => saveRules.mutate()}
            >
              {saveRules.isPending ? t("Ukládám…", "Saving…") : t("Uložit", "Save")}
            </Button>
            <Button
              variant="fresh"
              size="fresh"
              className="btn-secondary bg-card"
              onClick={() => setRulesOpen(false)}
            >
              {t("Zrušit", "Cancel")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
