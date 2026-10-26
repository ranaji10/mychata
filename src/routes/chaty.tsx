import { Button } from "@/components/ui/button";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Building2,
  Camera,
  FileText,
  Home,
  Plus,
  ScrollText,
  Wrench,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/bits";
import { CottageSetup } from "@/components/CottageSetup";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import type { Property } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { useMyCottages } from "@/lib/my-cottages";

export const Route = createFileRoute("/chaty")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Spravovat chaty — My Chata" },
      { name: "robots", content: "noindex" },
      { name: "description", content: "Your cottages, their photos, house manual and documents." },
      { property: "og:title", content: "Spravovat chaty — My Chata" },
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

type CottagePage = "/fotky" | "/manual" | "/dokumenty" | "/ukoly";

interface CottageCounts {
  photos: number;
  manual: number;
  documents: number;
  tasks: number;
}

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
    user,
  } = useAccount();
  const { data: myCottages } = useMyCottages(user?.id);
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

  // How much each cottage already has (T-042): photos, manual sections, documents (those the
  // viewer may see) and maintenance tasks. One small query per table for all cottages.
  const { data: counts } = useQuery({
    queryKey: ["cottage-counts", ids.join(",")],
    enabled: ids.length > 0,
    // Coming back from Photos or Documents after adding one shows the new number.
    staleTime: 0,
    queryFn: async () => {
      const tables = ["property_photos", "manual_sections", "documents", "tasks"] as const;
      const results = await Promise.all(
        tables.map((table) => supabase.from(table).select("property_id").in("property_id", ids)),
      );
      const out: Record<string, CottageCounts> = {};
      for (const id of ids) out[id] = { photos: 0, manual: 0, documents: 0, tasks: 0 };
      const keys = ["photos", "manual", "documents", "tasks"] as const;
      results.forEach(({ data, error }, i) => {
        if (error) throw error;
        for (const row of data ?? []) {
          const c = out[row.property_id];
          if (c) c[keys[i]!] += 1;
        }
      });
      return out;
    },
  });

  // Photos, manual and documents work on the cottage that is open, so open it first.
  const openFor = (p: Property, to: CottagePage) => {
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
        {counts && properties.length > 1 && (
          <p className="mt-1 text-[16px] font-semibold" data-testid="cottage-totals">
            {(() => {
              const sum = (k: keyof CottageCounts) =>
                Object.values(counts).reduce((n, c) => n + c[k], 0);
              const cz = (n: number, one: string, few: string, many: string) =>
                `${n} ${n === 1 ? one : n >= 2 && n <= 4 ? few : many}`;
              const en = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
              return t(
                `Celkem: ${cz(sum("photos"), "fotka", "fotky", "fotek")} · ${sum("manual")} v manuálu · ${cz(sum("documents"), "dokument", "dokumenty", "dokumentů")} · ${cz(sum("tasks"), "úkol", "úkoly", "úkolů")} údržby`,
                `In total: ${en(sum("photos"), "photo")} · ${en(sum("manual"), "manual section")} · ${en(sum("documents"), "document")} · ${en(sum("tasks"), "maintenance task")}`,
              );
            })()}
          </p>
        )}
        <div className="mt-3 space-y-3">
          {properties.map((p) => (
            <CottageCard
              key={p.id}
              property={p}
              open={p.id === property?.id}
              hasRules={!!rulesFor?.includes(p.id)}
              counts={counts?.[p.id]}
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
        {/* Members land on "Start my own cottage" (chata.nova explains adding needs an admin). */}
        <Link to="/chata/nova" className="btn-secondary mt-4 w-full">
          <Plus className="size-5" />{" "}
          {isAdmin
            ? t("Přidat chatu", "Add a cottage")
            : t("Založit vlastní chatu", "Start my own cottage")}
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
                  {myCottages && (
                    <p className="mt-1 text-[15px] text-muted-foreground">
                      {(myCottages[m.account_id] ?? []).map((c) => c.name).join(", ") ||
                        t("Zatím žádná chata", "No cottage yet")}
                    </p>
                  )}
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
  counts,
  isAdmin,
  onOpen,
}: {
  property: Property;
  open: boolean;
  hasRules: boolean;
  counts: CottageCounts | undefined;
  isAdmin: boolean;
  onOpen: (to: CottagePage) => void;
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
      // No embeddings on save any more: answers read the whole manual (ADR-0012).
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
          <span className="pill bg-card text-muted-foreground">
            {t("Právě otevřená", "Currently open")}
          </span>
        )}
      </div>
      {(property.address || property.city) && (
        <p className="truncate text-[16px] text-muted-foreground">
          {[property.address, property.city].filter(Boolean).join(", ")}
        </p>
      )}
      {/* The cottage's own pages; Maintenance holds its tasks (bugs 4, 4a). */}
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(
          [
            ["/fotky", Camera, t("Fotky", "Photos"), counts?.photos],
            ["/manual", BookOpen, t("Manuál", "Manual"), counts?.manual],
            ["/dokumenty", FileText, t("Dokumenty", "Documents"), counts?.documents],
            ["/ukoly", Wrench, t("Údržba", "Maintenance"), counts?.tasks],
          ] as const
        ).map(([to, Icon, label, count]) => (
          <Button
            key={to}
            variant="fresh"
            size="fresh"
            className={action}
            aria-label={count === undefined ? label : `${label}: ${count}`}
            onClick={() => onOpen(to)}
          >
            <Icon className="size-5" />
            {label}
            {count !== undefined && (
              <span className="text-[14px] font-semibold text-muted-foreground">
                {count === 0 ? t("zatím nic", "none yet") : count}
              </span>
            )}
          </Button>
        ))}
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
          <label className="block">
            <span className="label-text">{t("Pravidla domu", "House rules")}</span>
            <textarea
              className="field min-h-24 w-full"
              placeholder={t("Např. tichá noc od 22:00…", "E.g. quiet hours after 10 pm…")}
              value={rules}
              onChange={(e) => setRules(e.target.value)}
            />
          </label>
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
