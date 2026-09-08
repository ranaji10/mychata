import { Link } from "@tanstack/react-router";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({ title, back, action }: { title: string; back?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 mt-2 flex items-center gap-3">
      {back && (
        <Link
          to={back}
          aria-label="Zpět"
          className="grid size-11 shrink-0 place-items-center rounded-2xl bg-card text-foreground shadow-sm ring-1 ring-black/5"
        >
          <ArrowLeft className="size-5" />
        </Link>
      )}
      <h2 className="flex-1 text-2xl font-bold leading-tight">{title}</h2>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: "danger" | "ok" }) {
  return (
    <div className="card p-4">
      <p className="text-[13px] font-semibold text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-bold leading-none ${tone === "danger" ? "text-primary" : ""}`}>{value}</p>
      {hint && <p className="mt-1 text-[13px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, hint, action }: { icon: LucideIcon; title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-10 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
        <Icon className="size-7" strokeWidth={1.6} />
      </div>
      <p className="mt-4 text-lg font-bold">{title}</p>
      {hint && <p className="mt-1 text-[15px] text-muted-foreground">{hint}</p>}
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
  return <span className="pill bg-ok-soft text-ok">{children}</span>;
}
export function PillWarn({ children }: { children: ReactNode }) {
  return <span className="pill bg-warn-soft text-warn">{children}</span>;
}
export function PillDanger({ children }: { children: ReactNode }) {
  return <span className="pill bg-primary-soft text-primary">{children}</span>;
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
    <div className={`grid size-10 shrink-0 place-items-center rounded-full bg-fog text-sm font-bold text-muted-foreground ${className}`}>
      {initials || "?"}
    </div>
  );
}
