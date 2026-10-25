import { Button } from "@/components/ui/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useConsent } from "@/lib/consent";
import { AnalyticsSnapshotCard } from "@/components/AnalyticsSnapshotCard";
import { useAccount } from "@/lib/account";
import { LanguageToggle, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/soukromi")({
  staticData: { sitemap: true },
  head: () => ({
    meta: [
      { name: "twitter:card", content: "summary" },
      { title: "Soukromí a cookies — My Chata" },
      { name: "description", content: "How My Chata handles your data and cookies." },
      { property: "og:title", content: "Soukromí a cookies — My Chata" },
      { property: "og:description", content: "How My Chata handles your data and cookies." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { t } = useLang();
  const { choice, reopen } = useConsent();
  const { user } = useAccount();

  return (
    <main className="mx-auto min-h-screen max-w-[420px] bg-background p-5 pb-16 lg:max-w-[820px] lg:p-6 md:max-w-[720px] md:py-10">
      <div className="flex items-center justify-between">
        {/* Signed-in visitors arrived from Settings; the cookie banner opens this page for
            everyone, so the back arrow only appears for signed-in members. */}
        {user ? (
          <Link
            to="/vice"
            aria-label={t("Zpět na Nastavení", "Back to Settings")}
            className="grid size-11 place-items-center rounded-full bg-card text-foreground shadow-sm ring-1 ring-border"
          >
            <ArrowLeft className="size-5" />
          </Link>
        ) : (
          <span />
        )}
        <LanguageToggle />
      </div>
      <h1 className="mt-6 text-[28px] font-extrabold leading-[1.15]">
        {t("Soukromí a cookies", "Privacy & cookies")}
      </h1>

      <section className="card mt-4 space-y-2 p-4">
        <h2 className="text-lg font-bold">{t("Co sbíráme", "What we collect")}</h2>
        <ul className="list-disc space-y-1 pl-5 text-[16px] text-muted-foreground">
          <li>
            {t(
              "Jméno a e-mail, které zadáte při registraci, nebo jméno, e-mail a fotka z vašeho Google účtu.",
              "The name and email you give when signing up, or the name, email and photo from your Google account.",
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
              "Když se zeptáte manuálu nebo dokumentů, text manuálu, vašich dokumentů a otázka se pošlou k zodpovězení modelu umělé inteligence (Google Gemini přes Lovable AI). Stejně tak se jednou přečte text nahraného dokumentu.",
              "When you ask the manual or the documents, the text of the manual, your documents and the question are sent to an AI model (Google Gemini via Lovable AI) to answer. An uploaded document's text is read the same way, once.",
            )}
          </li>
          <li>
            {t(
              "Pouze se souhlasem: statistiky návštěv bez jména a e-mailu (Google Analytics). Co z nich vidíme, ukazujeme níže.",
              "Only with consent: visit statistics without your name or email (Google Analytics). What we see from them is shown below.",
            )}
          </li>
          <li>
            {t(
              "Abychom jednoho člověka na telefonu i počítači počítali jen jednou, posíláme Google Analytics po přihlášení náhodné interní číslo vašeho přihlášení (nikdy jméno ani e-mail), a to jen se souhlasem se statistikami.",
              "So that one person on a phone and a computer counts once, after you sign in we send Google Analytics the random internal number of your sign-in (never your name or email), and only with consent to statistics.",
            )}
          </li>
          <li>
            {t(
              "Google signals (odhad věku, pohlaví a zájmů z účtů Google) jsou zapnuté, ale fungují jen se souhlasem s reklamními cookies. O ten nežádáme, takže je od nás Google nedostává.",
              "Google signals (estimated age, gender and interests from Google accounts) are switched on but only work with consent to advertising cookies. We don't ask for it, so Google gets none of this from us.",
            )}
          </li>
        </ul>
      </section>

      <section className="card mt-4 space-y-2 p-4">
        <h2 className="text-lg font-bold">{t("Cookies", "Cookies")}</h2>
        <ul className="list-disc space-y-1 pl-5 text-[16px] text-muted-foreground">
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
        <p className="text-[16px] text-muted-foreground">
          {t("Aktuální volba:", "Current choice:")}{" "}
          <strong>
            {choice
              ? choice.analytics
                ? t("S analytikou", "With analytics")
                : t("Jen nezbytné", "Essentials only")
              : t("Zatím nevybráno", "Not chosen yet")}
          </strong>
        </p>
        <Button variant="fresh" size="fresh" className="btn-secondary w-full" onClick={reopen}>
          {t("Změnit nastavení cookies", "Change cookie settings")}
        </Button>
      </section>

      <AnalyticsSnapshotCard />

      <section className="card mt-4 space-y-2 p-4">
        <h2 className="text-lg font-bold">{t("Vaše práva (GDPR)", "Your rights (GDPR)")}</h2>
        <p className="text-[16px] text-muted-foreground">
          {t(
            "Máte právo na přístup, opravu, výmaz a přenositelnost svých dat. Souhlas můžete kdykoli odvolat výše. Kontakt: správce vaší chaty.",
            "You have the right to access, correct, delete and export your data. You can withdraw consent above anytime. Contact: your cottage admin.",
          )}
        </p>
      </section>
    </main>
  );
}
