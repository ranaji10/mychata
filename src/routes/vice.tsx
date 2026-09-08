import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Building2, ChevronRight, ClipboardCheck, Globe, Link2, LogOut, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Avatar, PageHeader } from "@/components/bits";
import { useAccount } from "@/lib/account";
import { LanguageToggle, useLang } from "@/lib/i18n";

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
  const { account, property, members, currentMemberId, setCurrentMemberId, selectAccount } = useAccount();
  const { t } = useLang();
  const navigate = useNavigate();
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

      <section className="card mt-4 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Users className="size-5 text-muted-foreground" />
          <h3 className="text-lg font-bold">{t("Přihlášený člen", "Signed-in member")}</h3>
        </div>
        <p className="mb-3 text-[13px] text-muted-foreground">{t("Zvolte, za koho v aplikaci jednáte.", "Choose who you are acting as.")}</p>
        <div className="space-y-1">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setCurrentMemberId(m.id);
                toast.success(t(`Jednáte jako ${m.name}.`, `You are acting as ${m.name}.`));
              }}
              className={`flex w-full items-center gap-3 rounded-2xl p-2 text-left ${
                m.id === currentMemberId ? "bg-primary-soft" : "active:bg-secondary"
              }`}
            >
              <Avatar name={m.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold">{m.name}</p>
                <p className="text-[13px] text-muted-foreground">
                  {m.role === "ADMIN" || m.role === "OWNER" ? t("Správce", "Admin") : t("Člen", "Member")}
                  {m.branch ? ` · ${m.branch}` : ""}
                </p>
              </div>
              {m.id === currentMemberId && <span className="pill bg-primary text-primary-foreground">{t("Aktivní", "Active")}</span>}
            </button>
          ))}
        </div>
      </section>

      <section className="card mt-4 divide-y divide-border p-0">
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
            selectAccount(null);
            navigate({ to: "/" });
          }}
          className="flex w-full items-center gap-3 p-4 text-left active:bg-secondary"
        >
          <LogOut className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[15px] font-bold">{t("Přepnout účet", "Switch account")}</span>
          <Building2 className="size-5 text-muted-foreground" />
        </button>
      </section>
    </AppShell>
  );
}
