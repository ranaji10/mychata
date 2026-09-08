import { Link, useRouterState } from "@tanstack/react-router";
import { CalendarDays, ClipboardList, Home, Inbox, Menu, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { useAccount } from "@/lib/account";

const FAMILY_TABS = [
  { to: "/domu", label: "Domů", icon: Home },
  { to: "/kalendar", label: "Kalendář", icon: CalendarDays },
  { to: "/ukoly", label: "Úkoly", icon: ClipboardList },
  { to: "/vydaje", label: "Výdaje", icon: Wallet },
  { to: "/vice", label: "Více", icon: Menu },
] as const;

const INST_TABS = [
  { to: "/domu", label: "Domů", icon: Home },
  { to: "/zadosti", label: "Žádosti", icon: Inbox },
  { to: "/kalendar", label: "Kalendář", icon: CalendarDays },
  { to: "/ukoly", label: "Úkoly", icon: ClipboardList },
  { to: "/vice", label: "Více", icon: Menu },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { account, property } = useAccount();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tabs = account?.type === "INSTITUTIONAL" ? INST_TABS : FAMILY_TABS;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[420px] bg-background text-foreground">
      <header className="sticky top-0 z-20 flex items-center gap-3 bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
        <Link to="/domu" className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground shadow-lg shadow-primary/30">
          M
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-muted-foreground">
            {account?.name ?? "My Chata"}
          </p>
          <h1 className="truncate text-xl font-bold leading-tight">{property?.name ?? "My Chata"}</h1>
        </div>
      </header>

      <main className="px-4 pb-32">{children}</main>

      <nav className="fixed bottom-0 left-1/2 z-30 w-full max-w-[420px] -translate-x-1/2 border-t border-border bg-card/95 px-2 pb-4 pt-2 backdrop-blur">
        <div className="grid grid-cols-5 gap-1">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = pathname === to || (to !== "/domu" && pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-2xl py-1.5 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className="size-6" strokeWidth={1.8} />
                <span className="text-[12px] font-bold">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
