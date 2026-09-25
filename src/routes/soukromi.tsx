import { createFileRoute } from "@tanstack/react-router";
import { useConsent } from "@/lib/consent";
import { LanguageToggle, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/soukromi")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { title: "Privacy & cookies — My Chata" },
      { name: "description", content: "How My Chata handles your data and cookies." },
      { property: "og:title", content: "Privacy & cookies — My Chata" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { t } = useLang();
  const { choice, reopen } = useConsent();

  return (
    <main className="mx-auto min-h-screen max-w-[420px] bg-background p-4 pb-16">
      <div className="flex justify-end">
        <LanguageToggle />
      </div>
      <h1 className="mt-6 text-2xl font-bold">{t("Soukromí a cookies", "Privacy & cookies")}</h1>

      <section className="card mt-4 space-y-2 p-4">
        <h2 className="text-lg font-bold">{t("Co sbíráme", "What we collect")}</h2>
        <ul className="list-disc space-y-1 pl-5 text-[15px] text-muted-foreground">
          <li>
            {t(
              "Jméno, e-mail a fotka z vašeho Google účtu (při přihlášení).",
              "Name, email and photo from your Google account (on sign-in).",
            )}
          </li>
          <li>
            {t(
              "Údaje, které sami zadáte: pobyty, úkoly, výdaje, dokumenty.",
              "Data you enter yourself: stays, tasks, expenses, documents.",
            )}
          </li>
          <li>
            {t(
              "Pouze se souhlasem: anonymní statistiky návštěv (Google Analytics).",
              "Only with consent: anonymous visit statistics (Google Analytics).",
            )}
          </li>
        </ul>
      </section>

      <section className="card mt-4 space-y-2 p-4">
        <h2 className="text-lg font-bold">{t("Cookies", "Cookies")}</h2>
        <ul className="list-disc space-y-1 pl-5 text-[15px] text-muted-foreground">
          <li>
            <strong>{t("Nezbytné", "Essential")}</strong> —{" "}
            {t(
              "přihlášení, jazyk, offline data. Vždy zapnuté.",
              "sign-in, language, offline data. Always on.",
            )}
          </li>
          <li>
            <strong>{t("Analytické", "Analytics")}</strong> —{" "}
            {t(
              "pouze s vaším souhlasem, lze kdykoli vypnout.",
              "only with your consent, can be turned off anytime.",
            )}
          </li>
        </ul>
        <p className="text-[15px] text-muted-foreground">
          {t("Aktuální volba:", "Current choice:")}{" "}
          <strong>
            {choice
              ? choice.analytics
                ? t("S analytikou", "With analytics")
                : t("Jen nezbytné", "Essentials only")
              : t("Zatím nevybráno", "Not chosen yet")}
          </strong>
        </p>
        <button className="btn-secondary w-full" onClick={reopen}>
          {t("Změnit nastavení cookies", "Change cookie settings")}
        </button>
      </section>

      <section className="card mt-4 space-y-2 p-4">
        <h2 className="text-lg font-bold">{t("Vaše práva (GDPR)", "Your rights (GDPR)")}</h2>
        <p className="text-[15px] text-muted-foreground">
          {t(
            "Máte právo na přístup, opravu, výmaz a přenositelnost svých dat. Souhlas můžete kdykoli odvolat výše. Kontakt: správce vaší chaty.",
            "You have the right to access, correct, delete and export your data. You can withdraw consent above anytime. Contact: your cottage admin.",
          )}
        </p>
      </section>
    </main>
  );
}
