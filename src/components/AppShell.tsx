import { Button } from "@/components/ui/button";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Home,
  Inbox,
  Menu,
  Plus,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useAccount } from "@/lib/account";
import { accountContextLine, sameName } from "@/lib/account-label";
import { useBrand } from "@/lib/brand";
import { Avatar } from "@/components/bits";
import { LanguageToggle, useLang } from "@/lib/i18n";
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
    { to: "/ukoly", label: t("Úkoly", "Tasks"), icon: ClipboardList },
    { to: "/vydaje", label: t("Výdaje", "Expenses"), icon: Wallet },
    { to: "/vice", label: t("Nastavení", "Settings"), icon: Menu },
  ] as const;

  const INST_TABS = [
    { to: "/domu", label: t("Domů", "Home"), icon: Home },
    { to: "/zadosti", label: t("Žádosti", "Requests"), icon: Inbox },
    { to: "/kalendar", label: t("Kalendář", "Calendar"), icon: CalendarDays },
    { to: "/ukoly", label: t("Úkoly", "Tasks"), icon: ClipboardList },
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

  // The small line above the cottage name says which account this is, but only when that adds
  // something: "Testing with Gemini" over "Testing with Gemini" read as a duplicate (bug 13),
  // and an organisation named after an email looked like the sign-in email (bug 2).
  const contextLine = accountContextLine(account, property?.name, t);
  const avatarSrc =
    profile?.avatar_url ?? (user.user_metadata?.["avatar_url"] as string | undefined) ?? null;

  const isActive = (to: string) => pathname === to || (to !== "/domu" && pathname.startsWith(to));

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
                <Link
                  key={to}
                  to={to}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-[16px] px-3 text-[16px] font-semibold ${
                    active
                      ? "bg-card text-primary shadow-chip"
                      : "text-sidebar-foreground hover:bg-secondary"
                  }`}
                >
                  <Icon className="size-[22px] shrink-0" strokeWidth={1.7} />
                  {label}
                </Link>
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
            {pathname === "/domu" ? (
              <Link to="/profil" aria-label={t("Můj profil", "My profile")} className="shrink-0">
                <Avatar
                  name={currentMember?.name ?? ""}
                  src={avatarSrc}
                  className="size-12 shadow-floating"
                />
              </Link>
            ) : (
              <Link
                to="/domu"
                aria-label={t("Domů", "Home")}
                className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-primary text-primary-foreground lg:hidden"
              >
                <Home className="size-6" strokeWidth={2} />
              </Link>
            )}
            <div className="min-w-0 flex-1">
              {contextLine && (
                <p className="truncate text-[16px] font-medium text-muted-foreground">
                  {contextLine}
                </p>
              )}
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
                <Icon
                  className={`size-[26px] ${active ? (to === "/domu" ? "fill-primary" : "fill-primary-soft") : ""}`}
                  strokeWidth={1.7}
                />
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

            <div className="mt-3 space-y-4">
              {memberships.map((m) => {
                const acc = accounts.find((a) => a.id === m.account_id);
                const isActiveAccount = m.account_id === account?.id;
                // Say the account's name once (bug 13): not above a cottage of the same name,
                // and not above a "Switch to …" button that already names it.
                const showTitle =
                  isActiveAccount && !properties.some((p) => sameName(p.name, acc?.name));
                return (
                  <div key={m.id}>
                    <div className="flex items-center gap-2">
                      {showTitle ? (
                        <p className="min-w-0 flex-1 truncate text-[16px] font-bold">
                          {acc?.name ?? "—"}
                        </p>
                      ) : (
                        <span className="flex-1" />
                      )}
                      {acc?.type === "INSTITUTIONAL" && (
                        <span className="pill bg-primary-soft text-primary">
                          {t("Organizace", "Organisation")}
                        </span>
                      )}
                      <span className="pill bg-secondary text-muted-foreground">
                        {roleLabel(m.role)}
                      </span>
                    </div>
                    {isActiveAccount ? (
                      <div className="mt-2 space-y-1.5">
                        {properties.map((p) => (
                          <Button
                            variant="fresh"
                            size="fresh"
                            key={p.id}
                            disabled={switching}
                            aria-current={p.id === property?.id ? "true" : undefined}
                            onClick={() => pickCottage(m.account_id, p.id)}
                            className={`flex min-h-[44px] w-full items-center rounded-2xl px-3 py-2 text-left text-[16px] font-bold ${
                              p.id === property?.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary"
                            }`}
                          >
                            {p.name}
                          </Button>
                        ))}
                        {!properties.length && (
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
                        className="mt-2 flex min-h-[44px] w-full items-center rounded-full bg-secondary px-3 py-2 text-left text-[16px] font-semibold"
                      >
                        {t(
                          `Přepnout na ${acc?.name ?? "tento účet"}`,
                          `Switch to ${acc?.name ?? "this account"}`,
                        )}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

            {(currentMember?.role === "ADMIN" || currentMember?.role === "OWNER") && (
              <Link
                to="/chata/nova"
                onClick={() => setSwitcherOpen(false)}
                className="btn-secondary mt-5 w-full"
              >
                <Plus className="size-5" /> {t("Přidat chatu", "Add a chata")}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
