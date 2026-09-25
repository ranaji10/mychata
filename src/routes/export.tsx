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
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/export")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
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

  const { data: requests, isLoading } = useQuery({
    queryKey: ["requests", property?.id],
    enabled: !!property,
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

  const [y = now.getFullYear(), m = now.getMonth() + 1] = month.split("-").map(Number);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;

  const inMonth = (requests ?? []).filter(
    (r) => r.start_date <= monthEnd && r.end_date >= monthStart,
  );

  const download = () => {
    const header = t(
      "Jméno;E-mail;Od;Do;Hostů;Oddělení;Stav;Odesláno",
      "Name;Email;From;To;Guests;Department;Status;Sent",
    );
    const rows = inMonth.map((r) =>
      [
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
      ].join(";"),
    );
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vyuziti-chaty-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${t("Staženo", "Downloaded")}: vyuziti-chaty-${month}.csv`);
  };

  return (
    <AppShell>
      <PageHeader
        title={t("Export využití", "Usage export")}
        subtitle={t("Souhrn žádostí pro evidenci.", "Summary of requests for records.")}
      />

      <section className="card mt-2 space-y-4 p-4">
        <div>
          <label htmlFor="export-month" className="mb-1 block text-[13px] font-bold">
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
          <p className="text-[13px] font-semibold text-muted-foreground">
            {monthNames(lang)[(m || 1) - 1]} {y}
          </p>
          {isLoading ? (
            <Skeleton className="mt-2 h-8" />
          ) : (
            <p className="mt-1 text-2xl font-bold">
              {inMonth.length} {t("žádostí", "requests")}
            </p>
          )}
        </div>

        <button
          onClick={download}
          disabled={isLoading || inMonth.length === 0}
          className="btn-primary w-full disabled:opacity-40"
        >
          <Download className="size-5" /> {t("Stáhnout CSV", "Download CSV")}
        </button>

        {inMonth.length === 0 && !isLoading && (
          <p className="flex items-center gap-2 rounded-2xl bg-secondary p-3 text-[14px] font-semibold text-muted-foreground">
            <FileSpreadsheet className="size-5 shrink-0" />
            {t("V tomto měsíci nejsou žádné žádosti.", "There are no requests this month.")}
          </p>
        )}
      </section>
    </AppShell>
  );
}
