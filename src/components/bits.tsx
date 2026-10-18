import { Link, useRouter } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
  const router = useRouter();
  return (
    <div className="mb-4 mt-2 flex items-center gap-3">
      {back && (
        <Link
          to={back}
          // Back goes back (bug 8): Photos opened from Settings → Manage cottages returns to
          // Settings with the list still open, not to the overview. `back` is the fallback
          // for a page opened directly (a bookmark, a reload with no history).
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.shiftKey || !router.history.canGoBack()) return;
            e.preventDefault();
            router.history.back();
          }}
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
      {hint && <p className="mt-2 text-[16px] text-muted-foreground">{hint}</p>}
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
      {hint && <p className="mt-2 text-[16px] text-muted-foreground">{hint}</p>}
      {action && <div className="mt-5 w-full">{action}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[22px] bg-secondary ${className}`} />;
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

export function Avatar({
  name,
  className = "",
  src,
}: {
  name: string;
  className?: string;
  /** A photo (the person's own profile photo); initials when missing. */
  src?: string | null | undefined;
}) {
  // A photo that fails to load (an expired Google link) falls back to the initials.
  const [broken, setBroken] = useState<string | null>(null);
  if (src && broken !== src) {
    return (
      <img
        src={src}
        alt=""
        onError={() => setBroken(src)}
        referrerPolicy="no-referrer"
        className={cn("size-10 shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    // translate="no": Chrome's page translation turned the initials "RD" into "Family house"
    // (Czech "RD" = rodinný dům) and spilled it out of the circle (bug 14a).
    <div
      translate="no"
      className={cn(
        "grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-base font-extrabold text-primary",
        className,
      )}
    >
      {initials || "?"}
    </div>
  );
}

/**
 * One row of a settings list (bug 6). Links and buttons look exactly the same: no rounded
 * corners (a pill-shaped button inside a divided list drew curved "shadows" at the dividers),
 * same height, icon bubble and chevron.
 */
export function SettingsRow({
  icon: Icon,
  label,
  hint,
  to,
  onClick,
  tone = "default",
  trailing,
  expanded,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string | undefined;
  to?: string;
  onClick?: () => void;
  tone?: "default" | "danger";
  trailing?: ReactNode;
  /** Set for a row that opens and closes a sub-list. */
  expanded?: boolean | undefined;
}) {
  const body = (
    <>
      <span
        className={`grid size-[34px] shrink-0 place-items-center rounded-full ${
          tone === "danger"
            ? "bg-destructive-soft text-destructive"
            : "bg-primary-soft text-primary"
        }`}
      >
        <Icon className="size-[22px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-bold">{label}</span>
        {hint && <span className="block text-[14px] text-muted-foreground">{hint}</span>}
      </span>
      {trailing}
      {expanded !== undefined ? (
        <ChevronDown
          className={`size-5 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      ) : tone === "danger" ? null : (
        <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
      )}
    </>
  );
  const cls =
    "settings-row flex min-h-[60px] w-full items-center gap-3 rounded-none py-3 text-left active:bg-secondary";
  if (to) {
    return (
      <Link to={to} className={cls}>
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-expanded={expanded} className={cls}>
      {body}
    </button>
  );
}
