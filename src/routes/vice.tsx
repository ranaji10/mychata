import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BookOpen, Building2, ChevronRight, ClipboardCheck, FileText, Globe, Link2, LogOut, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Avatar, PageHeader } from "@/components/bits";
import { useAccount } from "@/lib/account";
import { LanguageToggle, useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/vice")({
  head: () => ({
    meta: [
      { title: "More — My Chata" },
      { name: "description", content: "Account settings, members, language and other My Chata options." },
      { property: "og:title", content: "More — My Chata" },
      { property: "og:description", content: "Account settings, members, language and other My Chata options." },
    ],
  }),
  component: MorePage,
});

function MorePage() {
  const { account, property, members, currentMemberId } = useAccount();
  const { t } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isFamily = account?.type === "FAMILY";

  const copyPublicLink = async () => {
    if (!property) return;
    const url = `${window.location.origin}/verejne/kalendar/${property.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("Odkaz na veřejný kalendář zkopírován.", "Public calendar link copied."));
    } catch {
      toast.info(url);
    }
  };

  return (
    <AppShell>
      <PageHeader title={t("Více", "More")} subtitle={account?.name} />

      <section className="card p-4">
        <div className="mb-2 flex items-center gap-2">
          <Globe className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-bold">{t("Jazyk", "Language")}</h3>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-[14px] text-muted-foreground">{t("Čeština nebo angličtina.", "Czech or English.")}</p>
          <LanguageToggle />
        </div>
      </section>

      <section className="card mt-4 p-4"><div className="flex items-center gap-3"><Avatar name={members.find((m) => m.id === currentMemberId)?.name ?? ""} /><div><h3 className="font-bold">{members.find((m) => m.id === currentMemberId)?.name}</h3><p className="text-[13px] text-muted-foreground">{t("Přihlášený člen", "Signed-in member")}</p></div></div></section>

      <section className="card mt-4 divide-y divide-border p-0">
        <Link to="/manual" className="flex items-center gap-3 p-4 active:bg-secondary">
          <BookOpen className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[15px] font-bold">{t("Manuál chaty", "House Manual")}</span><ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        <Link to="/dokumenty" className="flex items-center gap-3 p-4 active:bg-secondary">
          <FileText className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[15px] font-bold">{t("Dokumenty", "Document Vault")}</span><ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        <Link to="/predani" className="flex items-center gap-3 p-4 active:bg-secondary">
          <ClipboardCheck className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[15px] font-bold">{t("Předání chaty", "Cottage handover")}</span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        {isFamily && (
          <button onClick={copyPublicLink} className="flex w-full items-center gap-3 p-4 text-left active:bg-secondary">
            <Link2 className="size-5 text-muted-foreground" />
            <span className="flex-1 text-[15px] font-bold">{t("Veřejný odkaz na kalendář", "Public calendar link")}</span>
            <ChevronRight className="size-5 text-muted-foreground" />
          </button>
        )}
        {!isFamily && (
          <Link to="/verejne/zadost" className="flex items-center gap-3 p-4 active:bg-secondary">
            <Link2 className="size-5 text-muted-foreground" />
            <span className="flex-1 text-[15px] font-bold">{t("Veřejný formulář žádosti", "Public request form")}</span>
            <ChevronRight className="size-5 text-muted-foreground" />
          </Link>
        )}
        <button
          onClick={() => {
            supabase.auth.signOut().then(() => {
              queryClient.clear();
              localStorage.removeItem("mychata.offline-cache");
              localStorage.removeItem("mychata.account");
              localStorage.removeItem("mychata.member");
              navigate({ to: "/auth", replace: true });
            });
          }}
          className="flex w-full items-center gap-3 p-4 text-left active:bg-secondary"
        >
          <LogOut className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[15px] font-bold">{t("Odhlásit se", "Sign out")}</span>
          <Building2 className="size-5 text-muted-foreground" />
        </button>
      </section>
    </AppShell>
  );
}
