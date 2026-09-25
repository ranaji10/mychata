import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BookOpen,
  Camera,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Globe,
  Home,
  Link2,
  LogOut,
  Shield,
  User,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Avatar, PageHeader } from "@/components/bits";
import { useAccount } from "@/lib/account";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/vice")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "More — My Chata" },
      {
        name: "description",
        content: "Account settings, members, language and other My Chata options.",
      },
      { property: "og:title", content: "More — My Chata" },
      {
        property: "og:description",
        content: "Account settings, members, language and other My Chata options.",
      },
    ],
  }),
  component: MorePage,
});

function MorePage() {
  const { account, property, members, currentMemberId } = useAccount();
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isFamily = account?.type === "FAMILY";
  const [langOpen, setLangOpen] = useState(false);

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

  const createGuestLink = async () => {
    if (!property || !currentMemberId) return;
    const token = crypto.randomUUID();
    const { error } = await supabase
      .from("guest_links")
      .insert({ property_id: property.id, token, created_by_member_id: currentMemberId });
    if (error) {
      toast.error(t("Odkaz se nepodařilo vytvořit.", "Could not create the link."));
      return;
    }
    const url = `${window.location.origin}/host/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(
        t(
          "Odkaz pro hosta zkopírován — pošlete ho komukoli.",
          "Guest link copied — send it to anyone.",
        ),
      );
    } catch {
      toast.info(url);
    }
  };

  return (
    <AppShell>
      <PageHeader title={t("Více", "More")} subtitle={account?.name} />

      <Link to="/profil" className="card flex items-center gap-3 p-4 active:bg-secondary">
        <Avatar name={members.find((m) => m.id === currentMemberId)?.name ?? ""} />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold">{members.find((m) => m.id === currentMemberId)?.name}</h3>
          <p className="text-[13px] text-muted-foreground">{t("Můj profil", "My profile")}</p>
        </div>
        <User className="size-5 text-muted-foreground" />
      </Link>

      <section className="card mt-4 divide-y divide-border p-0">
        <Link to="/clenove" className="flex items-center gap-3 p-4 active:bg-secondary">
          <Users className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[15px] font-bold">
            {t("Členové a oprávnění", "Members & permissions")}
          </span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        <Link to="/chata/nova" className="flex items-center gap-3 p-4 active:bg-secondary">
          <Home className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[15px] font-bold">{t("Přidat chatu", "Add a cottage")}</span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        <Link to="/fotky" className="flex items-center gap-3 p-4 active:bg-secondary">
          <Camera className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[15px] font-bold">{t("Fotky chaty", "Cottage photos")}</span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        <Link to="/manual" className="flex items-center gap-3 p-4 active:bg-secondary">
          <BookOpen className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[15px] font-bold">{t("Manuál chaty", "House Manual")}</span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        <Link
          to="/dokumenty"
          search={{ task: "" }}
          className="flex items-center gap-3 p-4 active:bg-secondary"
        >
          <FileText className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[15px] font-bold">{t("Dokumenty", "Document Vault")}</span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        <Link to="/predani" className="flex items-center gap-3 p-4 active:bg-secondary">
          <ClipboardCheck className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[15px] font-bold">
            {t("Předání chaty", "Cottage handover")}
          </span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        {isFamily && (
          <>
            <button
              onClick={copyPublicLink}
              className="flex w-full items-center gap-3 p-4 text-left active:bg-secondary"
            >
              <Link2 className="size-5 text-muted-foreground" />
              <span className="flex-1 text-[15px] font-bold">
                {t("Veřejný odkaz na kalendář", "Public calendar link")}
              </span>
              <ChevronRight className="size-5 text-muted-foreground" />
            </button>
            <button
              onClick={createGuestLink}
              className="flex w-full items-center gap-3 p-4 text-left active:bg-secondary"
            >
              <Link2 className="size-5 text-muted-foreground" />
              <span className="flex-1 text-[15px] font-bold">
                {t("Odkaz pro hosta bez účtu", "Guest booking link (no account)")}
              </span>
              <ChevronRight className="size-5 text-muted-foreground" />
            </button>
          </>
        )}
        {!isFamily && (
          <Link to="/verejne/zadost" className="flex items-center gap-3 p-4 active:bg-secondary">
            <Link2 className="size-5 text-muted-foreground" />
            <span className="flex-1 text-[15px] font-bold">
              {t("Veřejný formulář žádosti", "Public request form")}
            </span>
            <ChevronRight className="size-5 text-muted-foreground" />
          </Link>
        )}
      </section>

      {/* Language: collapsed row near the bottom */}
      <section className="card mt-4 p-0">
        <button
          onClick={() => setLangOpen((v) => !v)}
          className="flex w-full items-center gap-3 p-4 text-left"
          aria-expanded={langOpen}
        >
          <Globe className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[15px] font-bold">{t("Jazyk", "Language")}</span>
          <span className="text-[14px] font-semibold text-muted-foreground">
            {lang === "cs" ? "Čeština" : "English"}
          </span>
          <ChevronDown
            className={`size-5 text-muted-foreground transition-transform ${langOpen ? "rotate-180" : ""}`}
          />
        </button>
        {langOpen && (
          <div className="grid grid-cols-2 gap-2 px-4 pb-4">
            <button
              className={`btn-secondary ${lang === "cs" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setLang("cs")}
            >
              Čeština
            </button>
            <button
              className={`btn-secondary ${lang === "en" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setLang("en")}
            >
              English
            </button>
          </div>
        )}
      </section>

      <section className="card mt-4 divide-y divide-border p-0">
        <Link to="/soukromi" className="flex items-center gap-3 p-4 active:bg-secondary">
          <Shield className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[15px] font-bold">
            {t("Soukromí a cookies", "Privacy & cookies")}
          </span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        <button
          onClick={() => {
            supabase.auth.signOut().then(() => {
              queryClient.clear();
              localStorage.removeItem("mychata.offline-cache");
              navigate({ to: "/auth", replace: true });
            });
          }}
          className="flex w-full items-center gap-3 p-4 text-left active:bg-secondary"
        >
          <LogOut className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[15px] font-bold">{t("Odhlásit se", "Sign out")}</span>
        </button>
      </section>
    </AppShell>
  );
}
