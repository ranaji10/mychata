import { Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, Wallet, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useLang } from "@/lib/i18n";

export function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: string;
  subtitle?: string | undefined;
  back?: string;
  action?: ReactNode;
}) {
  const { t } = useLang();
  return (
    <div className="mb-4 mt-2 flex items-center gap-3">
      {back && (
        <Link
          to={back}
          aria-label={t("Zpět", "Back")}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-card text-foreground shadow-floating"
        >
          <ArrowLeft className="size-5" />
        </Link>
      )}

      <div className="min-w-0 flex-1">
        <h2 className="text-[28px] font-extrabold leading-[1.15]">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[16px] text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "danger" | "ok" | undefined;
}) {
  return (
    <div className="card h-full p-4 lg:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[14px] font-semibold text-muted-foreground">{label}</p>
        <span
          className={`grid size-[34px] shrink-0 place-items-center rounded-full ${typeof value === "string" && value.includes("Kč") ? "bg-warn-soft text-cat-expenses" : "bg-primary-soft text-primary"}`}
        >
          {typeof value === "string" && value.includes("Kč") ? (
            <Wallet className="size-[18px]" />
          ) : (
            <CalendarDays className="size-[18px]" />
          )}
        </span>
      </div>
      <p
        className={`mt-2 text-xl font-extrabold leading-tight lg:text-2xl ${tone === "danger" ? "text-destructive" : ""}`}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-[14px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
        <Icon className="size-7" strokeWidth={1.6} />
      </div>
      <p className="mt-4 text-lg font-bold">{title}</p>
      {hint && <p className="mt-2 text-[14px] text-muted-foreground">{hint}</p>}
      {action && <div className="mt-5 w-full">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-secondary ${className}`} />;
}

export function LoadingCards() {
  return (
    <div className="space-y-4 pt-2">
      <Skeleton className="h-40" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-32" />
    </div>
  );
}

export function PillOk({ children }: { children: ReactNode }) {
  return <span className="pill bg-primary-soft text-primary">{children}</span>;
}
export function PillWarn({ children }: { children: ReactNode }) {
  return <span className="pill bg-warn-soft text-warn-foreground">{children}</span>;
}
export function PillDanger({ children }: { children: ReactNode }) {
  return <span className="pill bg-destructive-soft text-destructive">{children}</span>;
}
export function PillNeutral({ children }: { children: ReactNode }) {
  return <span className="pill bg-secondary text-muted-foreground">{children}</span>;
}

export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={`grid size-10 shrink-0 place-items-center rounded-full bg-card text-base font-extrabold text-primary ${className}`}
    >
      {initials || "?"}
    </div>
  );
}
