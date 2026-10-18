import { Button } from "@/components/ui/button";
import { ManualCopyLink } from "@/components/ManualCopyLink";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ChevronRight,
  ClipboardCheck,
  Globe,
  Home,
  LayoutGrid,
  Link2,
  Link2Off,
  LogOut,
  Shield,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Avatar, PageHeader, SettingsRow } from "@/components/bits";
import { useAccount } from "@/lib/account";
import { avatarSource } from "@/lib/account-label";
import { COTTAGE_PAGES } from "@/lib/settings-nav";
import { useLang } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { publishedCalendarToken } from "@/lib/public-calendar";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/vice")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Nastavení — My Chata" },
      {
        name: "description",
        content: "Account settings, members, language and other My Chata options.",
      },
      { property: "og:title", content: "Nastavení — My Chata" },
      {
        property: "og:description",
        content: "Account settings, members, language and other My Chata options.",
      },
    ],
  }),
  component: MorePage,
});

function MorePage() {
  const { account, property, members, currentMemberId, profile, user } = useAccount();
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isFamily = account?.type === "FAMILY";
  const myRole = members.find((m) => m.id === currentMemberId)?.role;
  const isAdmin = myRole === "ADMIN" || myRole === "OWNER";
  // A member may pass on a calendar link the admin already published, but not publish one:
  // the row used to call the admin-only function and fail with a 403 (T-038).
  const showCalendarLink = isAdmin || !!property?.public_calendar_enabled;
  const [manualLink, setManualLink] = useState<{
    source: "calendar" | "guest";
    url: string;
  } | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [cottagesOpen, setCottagesOpen] = useState(false);
  const myName =
    (profile?.display_name ?? "").trim() ||
    members.find((m) => m.id === currentMemberId)?.name ||
    "";
  const [stopOpen, setStopOpen] = useState(false);
  const [stopping, setStopping] = useState(false);

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
    if (!isAdmin) {
      let token: string | null = null;
      try {
        token = await publishedCalendarToken(property.id);
      } catch {
        toast.error(t("Odkaz se nepodařilo načíst.", "Could not load the link."));
        return;
      }
      if (!token) {
        await queryClient.invalidateQueries({ queryKey: ["properties"] });
        toast.error(
          t(
            "Veřejný kalendář je vypnutý. Zapnout ho může jen správce.",
            "The public calendar is switched off. Only an admin can switch it on.",
          ),
        );
        return;
      }
      await shareLink(`${window.location.origin}/verejne/kalendar/${token}`, "calendar");
      return;
    }
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

  // Switch the public calendar off. The link stops working at once; switching it on again
  // ("Public calendar link") brings the same link back. The token is not rotated, because the
  // public house manual uses it too.
  const stopPublicCalendar = async () => {
    if (!property) return;
    setStopping(true);
    const { error } = await supabase.rpc("set_public_calendar", {
      _property_id: property.id,
      _enabled: false,
    });
    setStopping(false);
    if (error) {
      toast.error(
        t(
          "Veřejný kalendář může vypnout jen správce.",
          "Only an admin can switch off the calendar.",
        ),
      );
      return;
    }
    setStopOpen(false);
    setManualLink(null);
    await queryClient.invalidateQueries({ queryKey: ["properties"] });
    toast.success(t("Veřejný kalendář je vypnutý.", "The public calendar is switched off."));
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
      {/* Organisations keep a one-line reminder of whose settings these are; a family account
          named after an email no longer shows here (bug 7). */}
      <PageHeader
        title={t("Nastavení", "Settings")}
        subtitle={
          account?.type === "INSTITUTIONAL"
            ? t(`Organizace · ${account.name}`, `Organisation · ${account.name}`)
            : undefined
        }
      />

      <Link
        to="/profil"
        className="card flex min-h-[60px] items-center gap-3 px-4 py-3 active:bg-secondary"
      >
        <Avatar name={myName} src={avatarSource(profile, user)} className="size-12" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold">
            {myName || t("Doplňte své jméno", "Add your name")}
          </h3>
          <p className="text-[16px] text-muted-foreground">{t("Můj profil", "My profile")}</p>
        </div>
        <ChevronRight className="size-5 text-muted-foreground" />
      </Link>

      <section className="card mt-4 divide-y divide-divider overflow-hidden px-4 py-1">
        <SettingsRow
          to="/clenove"
          icon={Users}
          label={t("Členové a oprávnění", "Members & permissions")}
        />
        {/* Manage cottages opens its pages right here (bug 4a); the overview page stays the
            summary hub for every cottage (bug 4c). */}
        <SettingsRow
          icon={Home}
          label={t("Spravovat chaty", "Manage cottages")}
          hint={t(
            "Přehled, fotky, manuál, dokumenty, údržba",
            "Overview, photos, manual, documents, maintenance",
          )}
          expanded={cottagesOpen}
          onClick={() => setCottagesOpen((v) => !v)}
        />
        {cottagesOpen && (
          <div className="py-1 pl-6">
            <SettingsRow
              to="/chaty"
              icon={LayoutGrid}
              label={t("Přehled všech chat", "All cottages overview")}
            />
            {COTTAGE_PAGES.map((page) => (
              <SettingsRow
                key={page.to}
                to={page.to}
                icon={page.icon}
                label={t(...page.label)}
                hint={property?.name}
              />
            ))}
          </div>
        )}
        <SettingsRow
          to="/predani"
          icon={ClipboardCheck}
          label={t("Odjezdové úkoly", "Checkout Tasks")}
        />
        {isFamily && (
          <>
            {showCalendarLink && (
              <SettingsRow
                icon={Link2}
                label={t("Veřejný odkaz na kalendář", "Public calendar link")}
                onClick={() => void copyPublicLink()}
              />
            )}
            {manualLink?.source === "calendar" && (
              <div className="px-4">
                <ManualCopyLink url={manualLink.url} />
              </div>
            )}
            {isAdmin && property?.public_calendar_enabled && (
              <SettingsRow
                icon={Link2Off}
                tone="danger"
                label={t("Vypnout veřejný kalendář", "Switch off the public calendar")}
                onClick={() => setStopOpen(true)}
              />
            )}
            <SettingsRow
              icon={Link2}
              label={t("Odkaz pro hosta bez účtu", "Guest booking link (no account)")}
              onClick={() => void createGuestLink()}
            />
            {manualLink?.source === "guest" && (
              <div className="px-4">
                <ManualCopyLink url={manualLink.url} />
              </div>
            )}
          </>
        )}
        {!isFamily && (
          <Link
            to="/verejne/zadost/$token"
            params={{ token: property?.public_token ?? "" }}
            disabled={!property}
            className="settings-row flex min-h-[60px] items-center gap-3 rounded-none py-3 active:bg-secondary"
          >
            <span className="grid size-[34px] shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
              <Link2 className="size-[22px]" />
            </span>
            <span className="flex-1 text-[16px] font-bold">
              {t("Veřejný formulář žádosti", "Public request form")}
            </span>
            <ChevronRight className="size-5 text-muted-foreground" />
          </Link>
        )}
      </section>

      {/* Language: collapsed row near the bottom */}
      <section className="card mt-4 overflow-hidden px-4 py-1">
        <SettingsRow
          icon={Globe}
          label={t("Jazyk", "Language")}
          expanded={langOpen}
          onClick={() => setLangOpen((v) => !v)}
          trailing={
            <span className="text-[16px] font-semibold text-muted-foreground">
              {lang === "cs" ? "Čeština" : "English"}
            </span>
          }
        />
        {langOpen && (
          <div className="grid grid-cols-2 gap-2 pb-4">
            <Button
              variant="fresh"
              size="fresh"
              className={`btn-secondary ${lang === "cs" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setLang("cs")}
            >
              {t("Čeština", "Czech")}
            </Button>
            <Button
              variant="fresh"
              size="fresh"
              className={`btn-secondary ${lang === "en" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setLang("en")}
            >
              {t("Angličtina", "English")}
            </Button>
          </div>
        )}
      </section>

      <section className="card mt-4 divide-y divide-divider overflow-hidden px-4 py-1">
        <SettingsRow
          to="/soukromi"
          icon={Shield}
          label={t("Soukromí a cookies", "Privacy & cookies")}
        />
        <SettingsRow
          icon={LogOut}
          label={t("Odhlásit se", "Sign out")}
          onClick={() => {
            supabase.auth.signOut().then(() => {
              queryClient.clear();
              localStorage.removeItem("mychata.offline-cache");
              navigate({ to: "/auth", replace: true });
            });
          }}
        />
      </section>
      <ConfirmDialog
        open={stopOpen}
        onOpenChange={setStopOpen}
        title={t("Vypnout veřejný kalendář?", "Switch off the public calendar?")}
        description={t(
          "Odkaz, který jste sdíleli, přestane fungovat. Kdykoli ho můžete znovu zapnout tlačítkem Veřejný odkaz na kalendář.",
          "The link you shared will stop working. You can switch it on again at any time with Public calendar link.",
        )}
        confirmLabel={t("Vypnout", "Switch off")}
        onConfirm={stopPublicCalendar}
        busy={stopping}
      />
    </AppShell>
  );
}
