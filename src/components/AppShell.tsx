import { Button } from "@/components/ui/button";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  Home,
  Inbox,
  Menu,
  Plus,
  Search,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAccount } from "@/lib/account";
import { avatarSource, cottageCount } from "@/lib/account-label";
import { useBrand } from "@/lib/brand";
import { Avatar } from "@/components/bits";
import { LanguageToggle, useLang } from "@/lib/i18n";
import { useMyCottages, type MyCottage } from "@/lib/my-cottages";
import { readSeen, useNotifications } from "@/lib/notifications";
import { isCottagePath, isSettingsPath, SETTINGS_LINKS } from "@/lib/settings-nav";
import { useConnectivity } from "@/hooks/use-connectivity";
import { useIsMutating } from "@tanstack/react-query";
import { toast } from "sonner";

export function AppShell({ children }: { children: ReactNode }) {
  const {
    currentMember,
    account,
    property,
    properties,
    memberships,
    accounts,
    setActivePropertyId,
    switchAccount,
    user,
    profile,
    loading,
    needsOnboarding,
    identityError,
    retryIdentity,
  } = useAccount();
  useBrand(account?.type === "INSTITUTIONAL" ? "institution" : "family");
  const navigate = useNavigate();
  const { t } = useLang();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const online = useConnectivity();
  const mutating = useIsMutating();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [switcherFilter, setSwitcherFilter] = useState("");
  const { data: myCottages } = useMyCottages(user?.id);
  const notifications = useNotifications();
  const unseen = useUnseenCount(notifications.items, notifications.userId);

  // Tell the consent banner (rendered at root) that the mobile tab bar is present. Only when
  // the shell actually draws it: the loading and error screens below return early without it.
  const showsTabbar = !loading && !!user && !needsOnboarding && !identityError;
  useEffect(() => {
    if (!showsTabbar) return;
    document.documentElement.classList.add("has-tabbar");
    return () => document.documentElement.classList.remove("has-tabbar");
  }, [showsTabbar]);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth", replace: true });
  }, [loading, user, navigate]);
  useEffect(() => {
    if (!loading && user && needsOnboarding) navigate({ to: "/onboarding", replace: true });
  }, [loading, user, needsOnboarding, navigate]);

  if (loading || !user || needsOnboarding) return <div className="min-h-screen bg-background" />;

  if (identityError) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div role="alert" className="card w-full max-w-[420px] p-5 text-center">
          <p className="text-lg font-bold">
            {online
              ? t("Vaši chatu se nepodařilo načíst.", "Your cottage could not be loaded.")
              : t("Jste offline.", "You are offline.")}
          </p>
          <p className="mt-2 text-[16px] text-muted-foreground">
            {online
              ? t(
                  "Zkontrolujte připojení a zkuste to znovu.",
                  "Check your connection and try again.",
                )
              : t(
                  "Jakmile budete online, klepněte na Zkusit znovu.",
                  "Once you are online, tap Try again.",
                )}
          </p>
          <Button
            variant="fresh"
            size="fresh"
            onClick={retryIdentity}
            className="btn-primary mt-4 w-full"
          >
            {t("Zkusit znovu", "Try again")}
          </Button>
        </div>
      </div>
    );
  }

  const FAMILY_TABS = [
    { to: "/domu", label: t("Domů", "Home"), icon: Home },
    { to: "/kalendar", label: t("Kalendář", "Calendar"), icon: CalendarDays },
    // Tasks moved under Settings → Manage cottages → Maintenance (bug 4); Notifications took
    // its place (bug 5).
    { to: "/upozorneni", label: t("Upozornění", "Notifications"), icon: Bell },
    { to: "/vydaje", label: t("Výdaje", "Expenses"), icon: Wallet },
    { to: "/vice", label: t("Nastavení", "Settings"), icon: Menu },
  ] as const;

  const INST_TABS = [
    { to: "/domu", label: t("Domů", "Home"), icon: Home },
    { to: "/zadosti", label: t("Žádosti", "Requests"), icon: Inbox },
    { to: "/kalendar", label: t("Kalendář", "Calendar"), icon: CalendarDays },
    { to: "/upozorneni", label: t("Upozornění", "Notifications"), icon: Bell },
    { to: "/vice", label: t("Nastavení", "Settings"), icon: Menu },
  ] as const;

  const tabs = account?.type === "INSTITUTIONAL" ? INST_TABS : FAMILY_TABS;

  const roleLabel = (role: string) =>
    role === "OWNER"
      ? t("Vlastník", "Owner")
      : role === "ADMIN"
        ? t("Správce", "Admin")
        : t("Člen", "Member");

  const pickCottage = async (accountId: string, propertyId?: string) => {
    setSwitching(true);
    try {
      if (accountId !== account?.id) {
        // switchAccount already clears the chosen cottage; the first one becomes active.
        await switchAccount(accountId);
        if (propertyId) setActivePropertyId(propertyId);
      } else if (propertyId) {
        setActivePropertyId(propertyId);
      }
      setSwitcherOpen(false);
    } catch (error) {
      console.error("[shell] switch cottage", error);
      toast.error(
        t("Přepnutí se nepodařilo. Zkuste to znovu.", "Could not switch. Please try again."),
      );
    } finally {
      setSwitching(false);
    }
  };

  // No account line above the cottage name any more (bugs 1 and 7 of 18 Oct): an account
  // named after someone's email read as the signed-in person. Which account a cottage belongs
  // to is in the switcher; the person's own email is on My profile.
  const avatarSrc = avatarSource(profile, user);
  // Bug 7 asked for the person's own name at the top, and a prompt when there is none. The
  // avatar opens My profile, which shows the email (T-041).
  const myName = (profile?.display_name ?? "").trim() || currentMember?.name?.trim() || "";

  // Pages reached from Settings keep the Settings tab lit (bug 10).
  const isActive = (to: string) =>
    to === "/vice"
      ? isSettingsPath(pathname)
      : pathname === to || (to !== "/domu" && pathname.startsWith(to));
  const inSettings = isSettingsPath(pathname);
  const badge = (to: string) =>
    to === "/upozorneni" && unseen > 0 ? (
      <span
        aria-label={t(`${unseen} nových`, `${unseen} new`)}
        className="grid min-w-5 place-items-center rounded-full bg-destructive px-1 text-[12px] font-bold leading-5 text-primary-foreground"
      >
        {unseen > 9 ? "9+" : unseen}
      </span>
    ) : null;

  // The switcher lists every cottage of every account under the account's name (bug 16).
  // Until the database has my_cottages() (migration 0030), other accounts show "Switch to …".
  const cottagesOf = (accountId: string): MyCottage[] | null =>
    myCottages
      ? (myCottages[accountId] ?? [])
      : accountId === account?.id
        ? properties.map((p) => ({
            account_id: accountId,
            property_id: p.id,
            name: p.name,
            city: p.city ?? null,
          }))
        : null;
  const totalCottages = memberships.reduce(
    (n, m) => n + (cottagesOf(m.account_id)?.length ?? 1),
    0,
  );
  const filterText = switcherFilter.trim().toLowerCase();

  // Phone: one column with the tab bar at the bottom (the original design).
  // Tablet (md, 768px+): the same column, wider. Desktop (lg, 1024px+): the tabs move into a
  // sidebar on the left and the content gets a comfortable reading width.
  return (
    <div
      className={`min-h-screen w-full text-foreground ${pathname === "/domu" ? "page-fresh" : "bg-background"} ${account?.type === "INSTITUTIONAL" ? "brand-institution" : ""}`}
    >
      <div className="mx-auto w-full max-w-[420px] md:max-w-[720px] lg:grid lg:max-w-[1180px] lg:grid-cols-[248px_minmax(0,1fr)] lg:gap-10 lg:px-6">
        <aside className="hidden lg:block">
          <nav
            aria-label={t("Hlavní navigace", "Main navigation")}
            className="sticky top-0 flex max-h-screen flex-col gap-1 overflow-y-auto pb-6 pt-4"
          >
            <Link to="/domu" className="mb-4 flex min-h-11 items-center gap-3 px-2">
              <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-primary text-primary-foreground">
                <Home className="size-6" strokeWidth={2} />
              </span>
              <span className="text-lg font-extrabold">My Chata</span>
            </Link>
            {tabs.map(({ to, label, icon: Icon }) => {
              const active = isActive(to);
              return (
                <div key={to}>
                  <Link
                    to={to}
                    aria-current={active && pathname === to ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-3 rounded-[16px] px-3 text-[16px] font-semibold ${
                      active
                        ? "bg-card text-primary shadow-chip"
                        : "text-sidebar-foreground hover:bg-secondary"
                    }`}
                  >
                    <Icon className="size-[22px] shrink-0" strokeWidth={1.7} />
                    <span className="flex-1">{label}</span>
                    {badge(to)}
                  </Link>
                  {/* Inside Settings the sidebar shows where you are and lets you jump between
                      its pages without going back to the list (bug 4b). */}
                  {to === "/vice" && inSettings && (
                    <ul className="mt-1 space-y-0.5 border-l-2 border-divider pl-2 ml-5">
                      {SETTINGS_LINKS.map((link) => (
                        <li key={link.to}>
                          <SideLink to={link.to} pathname={pathname} label={t(...link.label)} />
                          {link.children && isCottagePath(pathname) && (
                            <ul className="ml-3 space-y-0.5 border-l-2 border-divider pl-2">
                              {link.children.map((child) => (
                                <li key={child.to}>
                                  <SideLink
                                    to={child.to}
                                    pathname={pathname}
                                    label={t(...child.label)}
                                  />
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        <div className="min-w-0 lg:max-w-[820px]">
          {!online && (
            <div className="sticky top-0 z-40 bg-warn-soft px-4 py-2 text-center text-[16px] font-semibold text-warn-foreground lg:rounded-b-2xl">
              {t(
                "Jste offline. Zobrazená data mohou být starší.",
                "You are offline. Displayed data may be out of date.",
              )}
            </div>
          )}
          {online && mutating > 0 && (
            <div className="sticky top-0 z-40 bg-ok-soft px-4 py-2 text-center text-[16px] font-semibold text-ok lg:rounded-b-2xl">
              {t("Synchronizuji změny…", "Syncing changes…")}
            </div>
          )}
          <header className="sticky top-0 z-20 bg-background/95 backdrop-blur flex items-center gap-3 px-5 pb-4 pt-5 md:px-6 lg:px-0">
            <Link to="/profil" aria-label={t("Můj profil", "My profile")} className="shrink-0">
              <Avatar
                name={myName}
                src={avatarSrc}
                className={pathname === "/domu" ? "size-12 shadow-floating" : "size-11"}
              />
            </Link>
            <div className="min-w-0 flex-1">
              {/* Who is signed in: their name, never an email (bugs 1 and 7). */}
              <p
                className={`truncate px-1 text-[14px] font-semibold leading-tight ${myName ? "text-muted-foreground" : "text-primary"}`}
              >
                {myName || t("Doplňte své jméno v profilu", "Add your name in your profile")}
              </p>
              {/* Chata switcher: the cottage name is always tappable and opens the sheet below. */}
              <Button
                variant="fresh"
                size="fresh"
                onClick={() => setSwitcherOpen(true)}
                className="flex min-h-11 max-w-full items-center gap-1 text-left"
                aria-haspopup="dialog"
                aria-expanded={switcherOpen}
              >
                <h1 className="truncate text-[17px] font-bold leading-tight">
                  {property?.name ?? "My Chata"}
                </h1>
                <ChevronDown className="size-[18px] shrink-0 text-muted-foreground" />
              </Button>
            </div>
            <LanguageToggle />
          </header>

          <main className="px-5 pb-28 md:px-6 lg:px-0 lg:pb-16">{children}</main>
        </div>
      </div>

      <nav
        aria-label={t("Hlavní navigace", "Main navigation")}
        className="fixed bottom-0 left-1/2 z-30 w-full max-w-[420px] -translate-x-1/2 border-t border-border h-[84px] bg-card px-2 pb-[env(safe-area-inset-bottom)] pt-2 md:max-w-[720px] lg:hidden"
      >
        <div className="grid grid-cols-5 gap-1">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = isActive(to);
            return (
              <Link
                key={to}
                to={to}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl py-1.5 ${
                  active ? "text-primary" : "text-nav-foreground"
                }`}
              >
                <span className="relative">
                  <Icon
                    className={`size-[26px] ${active ? (to === "/domu" ? "fill-primary" : "fill-primary-soft") : ""}`}
                    strokeWidth={1.7}
                  />
                  <span className="absolute -right-3 -top-1.5">{badge(to)}</span>
                </span>
                <span className="text-[12px] font-bold">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Chata & account switcher sheet */}
      {switcherOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 md:items-center md:p-6"
          onClick={() => setSwitcherOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("Vaše chaty a účty", "Your cottages and accounts")}
            className="max-h-[85vh] w-full max-w-[420px] overflow-y-auto rounded-t-[28px] bg-card p-5 pb-8 shadow-2xl md:max-w-[480px] md:rounded-[28px] md:pb-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{t("Vaše chaty", "Your cottages")}</h2>
              <Button
                variant="fresh"
                size="fresh"
                onClick={() => setSwitcherOpen(false)}
                aria-label={t("Zavřít", "Close")}
                className="grid size-11 place-items-center rounded-full bg-secondary"
              >
                <X className="size-5" />
              </Button>
            </div>

            {totalCottages > 8 && (
              <label className="field mt-3 flex items-center gap-2">
                <Search className="size-5 shrink-0 text-muted-foreground" />
                <input
                  value={switcherFilter}
                  onChange={(e) => setSwitcherFilter(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none"
                  placeholder={t("Najít chatu", "Find a cottage")}
                  aria-label={t("Najít chatu", "Find a cottage")}
                />
              </label>
            )}
            <div className="mt-3 space-y-4">
              {memberships.map((m) => {
                const acc = accounts.find((a) => a.id === m.account_id);
                const cottages = cottagesOf(m.account_id);
                const shown = (cottages ?? []).filter(
                  (c) =>
                    !filterText ||
                    c.name.toLowerCase().includes(filterText) ||
                    (acc?.name ?? "").toLowerCase().includes(filterText),
                );
                if (filterText && cottages && !shown.length) return null;
                return (
                  <section
                    key={m.id}
                    aria-label={acc?.name ?? undefined}
                    className="rounded-[20px] bg-background p-3"
                  >
                    {/* Every group says which account it is, so cottages of one account never
                        look nested inside a cottage of the same name (bug 16). */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="min-w-0 flex-1">
                        {/* The account is labelled as an account, with its cottage count: a family
                            account named like one of its cottages ("Chata Alfa (test)" holding
                            Alfa, Beta and Gama) made Beta look nested inside Alfa (bug 16). */}
                        <p className="text-[14px] font-semibold text-muted-foreground">
                          {acc?.type === "INSTITUTIONAL"
                            ? t("Účet organizace", "Organisation account")
                            : t("Rodinný účet", "Family account")}
                          {cottages
                            ? ` · ${cottageCount(cottages.length, t)}`
                            : ""}
                        </p>
                        <p className="truncate text-[16px] font-bold">{acc?.name ?? "—"}</p>
                      </div>
                      <span className="pill bg-secondary text-muted-foreground">
                        {roleLabel(m.role)}
                      </span>
                    </div>
                    {cottages ? (
                      <div className="mt-2 space-y-1.5">
                        {shown.map((c) => {
                          const current = c.property_id === property?.id;
                          return (
                            <Button
                              variant="fresh"
                              size="fresh"
                              key={c.property_id}
                              disabled={switching}
                              aria-current={current ? "true" : undefined}
                              onClick={() => pickCottage(m.account_id, c.property_id)}
                              className={`flex min-h-[44px] w-full items-center justify-between gap-2 rounded-2xl px-3 py-2 text-left text-[16px] font-bold ${
                                current ? "bg-primary text-primary-foreground" : "bg-card"
                              }`}
                            >
                              <span className="min-w-0 truncate">{c.name}</span>
                              {c.city && (
                                <span
                                  className={`shrink-0 text-[14px] font-semibold ${current ? "opacity-80" : "text-muted-foreground"}`}
                                >
                                  {c.city}
                                </span>
                              )}
                            </Button>
                          );
                        })}
                        {!cottages.length && (
                          <p className="text-[16px] text-muted-foreground">
                            {t("Zatím žádná chata.", "No cottage yet.")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <Button
                        variant="fresh"
                        size="fresh"
                        disabled={switching}
                        onClick={() => pickCottage(m.account_id)}
                        className="mt-2 flex min-h-[44px] w-full items-center rounded-2xl bg-card px-3 py-2 text-left text-[16px] font-semibold"
                      >
                        {t(
                          `Přepnout na ${acc?.name ?? "tento účet"}`,
                          `Switch to ${acc?.name ?? "this account"}`,
                        )}
                      </Button>
                    )}
                  </section>
                );
              })}
            </div>

            <Link
              to="/chata/nova"
              onClick={() => setSwitcherOpen(false)}
              className="btn-secondary mt-5 w-full"
            >
              <Plus className="size-5" />{" "}
              {currentMember?.role === "ADMIN" || currentMember?.role === "OWNER"
                ? t("Přidat chatu", "Add a chata")
                : t("Založit vlastní chatu", "Start my own cottage")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function SideLink({ to, pathname, label }: { to: string; pathname: string; label: string }) {
  const active = pathname === to || pathname.startsWith(`${to}/`);
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center rounded-[12px] px-3 text-[15px] ${
        active
          ? "bg-primary-soft font-bold text-primary"
          : "font-semibold text-sidebar-foreground hover:bg-secondary"
      }`}
    >
      {label}
    </Link>
  );
}

/** Notifications not seen yet; updates when the Notifications page marks them seen. */
function useUnseenCount(items: { key: string }[], userId: string | undefined) {
  const [seen, setSeen] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    const refresh = () => setSeen(readSeen(userId));
    refresh();
    window.addEventListener("mychata:notifications-seen", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("mychata:notifications-seen", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [userId]);
  return items.filter((i) => !seen.has(i.key)).length;
}
