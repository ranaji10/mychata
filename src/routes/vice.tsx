import { Button } from "@/components/ui/button";
import { ManualCopyLink } from "@/components/ManualCopyLink";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Settings — My Chata" },
      {
        name: "description",
        content: "Account settings, members, language and other My Chata options.",
      },
      { property: "og:title", content: "Settings — My Chata" },
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
  const [manualLink, setManualLink] = useState<{
    source: "calendar" | "guest";
    url: string;
  } | null>(null);
  const [langOpen, setLangOpen] = useState(false);

  // Share a link: the phone's share sheet when available, otherwise copy to the clipboard.
  // The toast says the link was copied — never the raw URL.
  const shareLink = async (url: string, source: "calendar" | "guest") => {
    setManualLink(null);
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ url, title: "My Chata" });
        return;
      } catch {
        // Share sheet dismissed or unavailable — fall through to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setManualLink(null);
      toast.success(t("Odkaz zkopírován", "Link copied"));
    } catch {
      setManualLink({ source, url });
    }
  };

  const copyPublicLink = async () => {
    if (!property) return;
    // Publishing the calendar is an explicit admin action; the link uses the share token.
    const { data: publicToken, error: publishError } = await supabase.rpc("set_public_calendar", {
      _property_id: property.id,
      _enabled: true,
    });
    if (publishError || !publicToken) {
      toast.error(
        t("Veřejný kalendář může zapnout jen správce.", "Only an admin can publish the calendar."),
      );
      return;
    }
    await shareLink(`${window.location.origin}/verejne/kalendar/${publicToken}`, "calendar");
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
    await shareLink(`${window.location.origin}/host/${token}`, "guest");
  };

  return (
    <AppShell>
      <PageHeader title={t("Nastavení", "Settings")} subtitle={account?.name} />

      <Link to="/profil" className="card flex items-center gap-3 p-4 active:bg-secondary">
        <Avatar name={members.find((m) => m.id === currentMemberId)?.name ?? ""} />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold">{members.find((m) => m.id === currentMemberId)?.name}</h3>
          <p className="text-[16px] text-muted-foreground">{t("Můj profil", "My profile")}</p>
        </div>
        <User className="size-5 text-muted-foreground" />
      </Link>

      <section className="card mt-4 divide-y divide-divider p-0">
        <Link to="/clenove" className="flex items-center gap-3 p-4 active:bg-secondary">
          <Users className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[16px] font-bold">
            {t("Členové a oprávnění", "Members & permissions")}
          </span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        <Link to="/chata/nova" className="flex items-center gap-3 p-4 active:bg-secondary">
          <Home className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[16px] font-bold">{t("Přidat chatu", "Add a cottage")}</span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        <Link to="/fotky" className="flex items-center gap-3 p-4 active:bg-secondary">
          <Camera className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[16px] font-bold">{t("Fotky chaty", "Cottage photos")}</span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        <Link to="/manual" className="flex items-center gap-3 p-4 active:bg-secondary">
          <BookOpen className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[16px] font-bold">{t("Manuál chaty", "House Manual")}</span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        <Link to="/dokumenty" className="flex items-center gap-3 p-4 active:bg-secondary">
          <FileText className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[16px] font-bold">{t("Dokumenty", "Document Vault")}</span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        <Link to="/predani" className="flex items-center gap-3 p-4 active:bg-secondary">
          <ClipboardCheck className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[16px] font-bold">
            {t("Odjezdový checklist", "Check-out checklist")}
          </span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        {isFamily && (
          <>
            <Button
              variant="fresh"
              size="fresh"
              onClick={copyPublicLink}
              className="flex w-full items-center gap-3 p-4 text-left active:bg-secondary"
            >
              <Link2 className="size-5 text-muted-foreground" />
              <span className="flex-1 text-[16px] font-bold">
                {t("Veřejný odkaz na kalendář", "Public calendar link")}
              </span>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Button>
            <div className="px-4">
              <ManualCopyLink url={manualLink?.source === "calendar" ? manualLink.url : null} />
            </div>
            <Button
              variant="fresh"
              size="fresh"
              onClick={createGuestLink}
              className="flex w-full items-center gap-3 p-4 text-left active:bg-secondary"
            >
              <Link2 className="size-5 text-muted-foreground" />
              <span className="flex-1 text-[16px] font-bold">
                {t("Odkaz pro hosta bez účtu", "Guest booking link (no account)")}
              </span>
              <ChevronRight className="size-5 text-muted-foreground" />
            </Button>
            <div className="px-4">
              <ManualCopyLink url={manualLink?.source === "guest" ? manualLink.url : null} />
            </div>
          </>
        )}
        {!isFamily && (
          <Link
            to="/verejne/zadost/$token"
            params={{ token: property?.public_token ?? "" }}
            disabled={!property}
            className="flex items-center gap-3 p-4 active:bg-secondary"
          >
            <Link2 className="size-5 text-muted-foreground" />
            <span className="flex-1 text-[16px] font-bold">
              {t("Veřejný formulář žádosti", "Public request form")}
            </span>
            <ChevronRight className="size-5 text-muted-foreground" />
          </Link>
        )}
      </section>

      {/* Language: collapsed row near the bottom */}
      <section className="card mt-4 p-0">
        <Button
          variant="fresh"
          size="fresh"
          onClick={() => setLangOpen((v) => !v)}
          className="flex w-full items-center gap-3 p-4 text-left"
          aria-expanded={langOpen}
        >
          <Globe className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[16px] font-bold">{t("Jazyk", "Language")}</span>
          <span className="text-[16px] font-semibold text-muted-foreground">
            {lang === "cs" ? "Čeština" : "English"}
          </span>
          <ChevronDown
            className={`size-5 text-muted-foreground transition-transform ${langOpen ? "rotate-180" : ""}`}
          />
        </Button>
        {langOpen && (
          <div className="grid grid-cols-2 gap-2 px-4 pb-4">
            <Button
              variant="fresh"
              size="fresh"
              className={`btn-secondary ${lang === "cs" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setLang("cs")}
            >
              Čeština
            </Button>
            <Button
              variant="fresh"
              size="fresh"
              className={`btn-secondary ${lang === "en" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setLang("en")}
            >
              English
            </Button>
          </div>
        )}
      </section>

      <section className="card mt-4 divide-y divide-divider p-0">
        <Link to="/soukromi" className="flex items-center gap-3 p-4 active:bg-secondary">
          <Shield className="size-5 text-muted-foreground" />
          <span className="flex-1 text-[16px] font-bold">
            {t("Soukromí a cookies", "Privacy & cookies")}
          </span>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>
        <Button
          variant="fresh"
          size="fresh"
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
          <span className="flex-1 text-[16px] font-bold">{t("Odhlásit se", "Sign out")}</span>
        </Button>
      </section>
    </AppShell>
  );
}
