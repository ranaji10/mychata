import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  CalendarCheck,
  FileText,
  Inbox,
  Mail,
  User,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { EmptyState, LoadingCards, PageHeader } from "@/components/bits";
import { useLang } from "@/lib/i18n";
import {
  markSeen,
  readSeen,
  useNotifications,
  type AppNotification,
  type NotificationKind,
} from "@/lib/notifications";

export const Route = createFileRoute("/upozorneni")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Upozornění — My Chata" },
      { name: "robots", content: "noindex" },
      {
        name: "description",
        content: "Invitations, approvals, maintenance tasks, bills and documents in one place.",
      },
      { property: "og:title", content: "Upozornění — My Chata" },
      {
        property: "og:description",
        content: "Invitations, approvals, maintenance tasks, bills and documents in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NotificationsPage,
});

const ICONS: Record<NotificationKind, LucideIcon> = {
  invitation: Mail,
  approval: CalendarCheck,
  guest_request: CalendarCheck,
  institution_request: Inbox,
  task_assigned: Wrench,
  task_overdue: AlertTriangle,
  task_new: Wrench,
  owe: Wallet,
  document_expiry: FileText,
  profile: User,
};

/** Notifications (bug 5): what happened and what needs you, newest first. */
function NotificationsPage() {
  const { t } = useLang();
  const { items, loading, failed, userId } = useNotifications();
  // Remember what was new when the page opened, then clear the tab badge.
  const seenBefore = useMemo(() => readSeen(userId), [userId]);
  const keys = items.map((i) => i.key).join("|");
  useEffect(() => {
    if (!loading && userId) markSeen(userId, keys ? keys.split("|") : []);
  }, [keys, loading, userId]);

  const needsYou = items.filter((i) => i.tone !== "info");
  const fyi = items.filter((i) => i.tone === "info");

  return (
    <AppShell>
      <PageHeader
        title={t("Upozornění", "Notifications")}
        subtitle={t("Co se děje a co čeká na vás", "What's happening and what needs you")}
      />
      {failed && (
        <p role="alert" className="card mb-3 p-4 font-semibold text-destructive">
          {t("Některá upozornění se nepodařilo načíst.", "Some notifications could not be loaded.")}
        </p>
      )}
      {loading ? (
        <LoadingCards />
      ) : !items.length ? (
        <EmptyState
          icon={Bell}
          title={t("Nic nového.", "Nothing new.")}
          hint={t(
            "Pozvánky, žádosti, úkoly údržby a dluhy se objeví tady.",
            "Invitations, requests, maintenance tasks and money owed will show up here.",
          )}
        />
      ) : (
        <div className="space-y-4">
          {needsYou.length > 0 && (
            <Group title={t("Čeká na vás", "Needs you")} items={needsYou} seen={seenBefore} />
          )}
          {fyi.length > 0 && (
            <Group
              title={t("Pro informaci", "For your information")}
              items={fyi}
              seen={seenBefore}
            />
          )}
        </div>
      )}
    </AppShell>
  );
}

function Group({
  title,
  items,
  seen,
}: {
  title: string;
  items: AppNotification[];
  seen: Set<string>;
}) {
  const { t, lang } = useLang();
  const pick = (pair: [string, string]) => (lang === "en" ? pair[1] : pair[0]);
  return (
    <section className="card px-4 py-1">
      <h2 className="pt-3 text-lg font-bold">{title}</h2>
      <ul className="divide-y divide-divider">
        {items.map((item) => {
          const Icon = ICONS[item.kind];
          const isNew = !seen.has(item.key);
          return (
            <li key={item.key}>
              <Link
                to={item.to}
                params={item.params ?? {}}
                className="flex min-h-[64px] items-center gap-3 py-3 active:bg-secondary"
              >
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-full ${
                    item.tone === "warn"
                      ? "bg-warn-soft text-warn-foreground"
                      : "bg-primary-soft text-primary"
                  }`}
                >
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-[16px] font-bold">
                    {pick(item.title)}
                  </span>
                  {item.detail && (
                    <span className="block text-[15px] text-muted-foreground">
                      {pick(item.detail)}
                    </span>
                  )}
                </span>
                {isNew && (
                  <span className="pill shrink-0 bg-primary text-primary-foreground">
                    {t("Nové", "New")}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
