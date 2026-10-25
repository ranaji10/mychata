import { BarChart3, EyeOff } from "lucide-react";
import { fmtDate } from "@/lib/data";
import { useLang } from "@/lib/i18n";
import { useQuery } from "@tanstack/react-query";
import { getLiveAnalytics } from "@/lib/analytics-live.functions";
import { ANALYTICS_SNAPSHOT, formatDuration, type ShareRow } from "@/lib/analytics-snapshot";

/** One horizontal bar per row: label, value at the end, one hue (T-043). */
function Bars({ title, rows }: { title: string; rows: ShareRow[] }) {
  const { lang } = useLang();
  return (
    <div>
      <h3 className="text-[16px] font-bold">{title}</h3>
      <ul className="mt-2 space-y-2">
        {rows.map((r) => (
          <li key={r.label[1]}>
            <div className="flex items-baseline justify-between gap-3 text-[15px]">
              <span className="min-w-0">{lang === "en" ? r.label[1] : r.label[0]}</span>
              <span className="shrink-0 font-bold tabular-nums">{r.pct} %</span>
            </div>
            <div
              className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-secondary"
              aria-hidden="true"
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${r.pct}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-primary-soft p-3">
      <p className="text-[24px] font-extrabold leading-tight tabular-nums">{value}</p>
      <p className="text-[14px] font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}

/**
 * "How we see your visit": the aggregated numbers Google Analytics shows the maintainers,
 * so visitors deciding about the analytics cookie can see exactly what it produces.
 */
export function AnalyticsSnapshotCard() {
  const { t, lang } = useLang();
  const n = (v: number) => v.toLocaleString(lang === "en" ? "en-GB" : "cs-CZ");
  // D-28: live numbers from the GA4 Data API when the hosting has its key; else the snapshot.
  const { data: live } = useQuery({
    queryKey: ["ga-live"],
    queryFn: () => getLiveAnalytics(),
    staleTime: 60 * 60 * 1000,
    retry: false,
  });
  const S = live ?? ANALYTICS_SNAPSHOT;
  return (
    <section className="card mt-4 space-y-4 p-4" aria-labelledby="ga-snapshot-title">
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground">
          <BarChart3 className="size-6" />
        </div>
        <div>
          <h2 id="ga-snapshot-title" className="text-lg font-bold">
            {t("Takhle vidíme statistiky my", "What the statistics look like to us")}
          </h2>
          <p className="text-[15px] text-muted-foreground">
            {t(
              `Skutečná čísla z Google Analytics za ${fmtDate(S.period.from)} – ${fmtDate(S.period.to)}${live ? " (aktualizují se samy)" : ""}. Víc z analytických cookies nevidíme.`,
              `Real numbers from Google Analytics for ${fmtDate(S.period.from)} – ${fmtDate(S.period.to)}${live ? " (updated automatically)" : ""}. This is all the analytics cookie gives us.`,
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Tile value={n(S.activeUsers)} label={t("návštěvníků", "visitors")} />
        <Tile value={n(S.sessions)} label={t("návštěv", "visits")} />
        <Tile value={n(S.pageViews)} label={t("zobrazených stránek", "pages viewed")} />
        <Tile
          value={formatDuration(S.engagementSeconds)}
          label={t("průměrně na návštěvníka", "on average per visitor")}
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Bars title={t("Zařízení", "Devices")} rows={S.devices} />
        <Bars title={t("Prohlížeče", "Browsers")} rows={S.browsers} />
        <Bars title={t("Odkud (země)", "Where from (country)")} rows={S.countries} />
        <Bars title={t("Nejčastější stránky", "Most viewed pages")} rows={S.pages} />
      </div>

      <div className="rounded-2xl bg-background p-3">
        <p className="text-[15px] font-bold">
          {t("Jedna návštěva, jak ji dostaneme:", "One visit, as it reaches us:")}
        </p>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground">
          {lang === "en"
            ? "page: /kalendar · device: phone · browser: Chrome\ncountry: Czechia · language: cs · time on page: 1 min 12 s"
            : "stránka: /kalendar · zařízení: telefon · prohlížeč: Chrome\nzemě: Česko · jazyk: cs · čas na stránce: 1 min 12 s"}
        </pre>
      </div>

      <div className="flex items-start gap-3">
        <EyeOff className="mt-0.5 size-5 shrink-0 text-primary" />
        <p className="text-[15px] text-muted-foreground">
          {t(
            "Nevidíme vaše jméno, e-mail, název chaty ani nic, co do aplikace napíšete. Reklamní cookies nepoužíváme a data neprodáváme. Podrobné záznamy o návštěvách Google maže po 14 měsících.",
            "We don't see your name, email, cottage name or anything you type into the app. We use no advertising cookies and sell no data. Google deletes the detailed visit records after 14 months.",
          )}
        </p>
      </div>
    </section>
  );
}
