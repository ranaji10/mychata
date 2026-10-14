import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { PageHeader, Skeleton } from "@/components/bits";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { fmtDate, monthNames, type InstitutionalRequest } from "@/lib/data";
import { csvRow } from "@/lib/csv";
import { useLang } from "@/lib/i18n";
import { useInstitutionOnly } from "@/lib/use-institution-only";

export const Route = createFileRoute("/export")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Usage export — My Chata" },
      { name: "description", content: "CSV export of cottage usage by month." },
      { property: "og:title", content: "Usage export — My Chata" },
      { property: "og:description", content: "CSV export of cottage usage by month." },
    ],
  }),
  component: ExportPage,
});

function ExportPage() {
  const { t, lang } = useLang();
  const { property } = useAccount();
  const now = new Date();
  const [month, setMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
  );

  const hidden = useInstitutionOnly();

  const {
    data: requests,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["requests", property?.id],
    enabled: !!property && !hidden,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("institutional_requests")
        .select("*")
        .eq("property_id", property!.id)
        .order("start_date");
      if (error) throw error;
      return data as InstitutionalRequest[];
    },
  });

  // Clearing the month field gives ""; keep showing the current month instead of "-01".
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const safeMonth = /^\d{4}-\d{2}$/.test(month) ? month : thisMonth;
  const [y = now.getFullYear(), m = now.getMonth() + 1] = safeMonth.split("-").map(Number);
  const monthStart = `${safeMonth}-01`;
  const monthEnd = `${safeMonth}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;

  const inMonth = (requests ?? []).filter(
    (r) => r.start_date <= monthEnd && r.end_date >= monthStart,
  );

  const download = () => {
    const header = t(
      "Jméno;E-mail;Od;Do;Hostů;Oddělení;Stav;Odesláno",
      "Name;Email;From;To;Guests;Department;Status;Sent",
    );
    const rows = inMonth.map((r) =>
      csvRow([
        r.requester_name,
        r.requester_email,
        fmtDate(r.start_date),
        fmtDate(r.end_date),
        r.guests,
        r.affiliation ?? "",
        r.status === "APPROVED"
          ? t("Schváleno", "Approved")
          : r.status === "DECLINED"
            ? t("Zamítnuto", "Declined")
            : t("Čeká", "Pending"),
        fmtDate(r.created_at.slice(0, 10)),
      ]),
    );
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vyuziti-chaty-${safeMonth}.csv`;
    a.click();
    // Revoking straight after click() can cancel the download in Safari.
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    toast.success(`${t("Staženo", "Downloaded")}: vyuziti-chaty-${safeMonth}.csv`);
  };

  if (hidden) return null;

  return (
    <AppShell>
      <PageHeader
        title={t("Export využití", "Usage export")}
        subtitle={t("Souhrn žádostí pro evidenci.", "Summary of requests for records.")}
      />

      <section className="card mt-2 space-y-4 p-4">
        <div>
          <label htmlFor="export-month" className="label-text text-[16px]">
            {t("Měsíc", "Month")}
          </label>
          <input
            id="export-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="field"
          />
        </div>

        <div className="rounded-2xl bg-background p-4">
          <p className="text-[16px] font-semibold text-muted-foreground">
            {monthNames(lang)[(m || 1) - 1]} {y}
          </p>
          {isLoading ? (
            <Skeleton className="mt-2 h-8" />
          ) : isError && !requests ? (
            <div role="alert" className="mt-1">
              <p className="font-bold">
                {t("Žádosti se nepodařilo načíst.", "Could not load the requests.")}
              </p>
              <Button
                variant="fresh"
                size="fresh"
                onClick={() => void refetch()}
                className="btn-secondary mt-2 w-full"
              >
                {t("Zkusit znovu", "Try again")}
              </Button>
            </div>
          ) : (
            <p className="mt-1 text-[28px] font-extrabold leading-[1.15]">
              {inMonth.length} {t("žádostí", "requests")}
            </p>
          )}
        </div>

        <Button
          variant="fresh"
          size="fresh"
          onClick={download}
          disabled={isLoading || inMonth.length === 0}
          className="btn-primary w-full disabled:opacity-40"
        >
          <Download className="size-5" /> {t("Stáhnout CSV", "Download CSV")}
        </Button>

        {inMonth.length === 0 && !isLoading && !(isError && !requests) && (
          <p className="flex items-center gap-2 rounded-2xl bg-secondary p-3 text-[16px] font-semibold text-muted-foreground">
            <FileSpreadsheet className="size-5 shrink-0" />
            {t("V tomto měsíci nejsou žádné žádosti.", "There are no requests this month.")}
          </p>
        )}
      </section>
    </AppShell>
  );
}
