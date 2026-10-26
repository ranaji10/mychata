import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, Mail, MessageSquareWarning } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/bits";
import { useAccount } from "@/lib/account";
import { BUILD_SHA, BUILD_TIME } from "@/lib/build-info";
import { fmtDateTime } from "@/lib/data";
import { useLang } from "@/lib/i18n";

// Help & support (T-046, 26 Oct 2026): short answers to the questions people ask first, and
// one way to reach us. Replies go to podpora@mychata.cz, the same Reply-To address the app's
// e-mails will use (T-005).
export const SUPPORT_EMAIL = "podpora@mychata.cz";

export const Route = createFileRoute("/pomoc")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Nápověda a podpora — My Chata" },
      { name: "description", content: "Answers to common questions and how to contact My Chata." },
      { property: "og:title", content: "Nápověda a podpora — My Chata" },
      {
        property: "og:description",
        content: "Answers to common questions and how to contact My Chata.",
      },
    ],
  }),
  component: HelpPage,
});

interface Faq {
  q: [cs: string, en: string];
  a: [cs: string, en: string];
  link?: { to: string; label: [cs: string, en: string] };
}

const FAQS: Faq[] = [
  {
    q: ["Jak pozvu rodinu nebo kolegy?", "How do I invite family or colleagues?"],
    a: [
      "Správce v Nastavení otevře Členové a oprávnění a zvolí Pozvat nového člena. Odkaz pošle e-mailem, sdílením nebo zkopírováním.",
      "An admin opens Members & permissions in Settings and chooses Invite a new member, then sends the link by e-mail, shares it or copies it.",
    ],
    link: { to: "/clenove", label: ["Členové a oprávnění", "Members & permissions"] },
  },
  {
    q: ["Jak si zarezervuji pobyt?", "How do I book a stay?"],
    a: [
      "Na Domů zvolte Přidat pobyt (nebo v Kalendáři Pobyt), klepněte na den příjezdu a pak na den odjezdu. Pokud chata vyžaduje schválení, pobyt potvrdí správce.",
      "On Home choose Add booking (or Stay in the Calendar), tap your arrival day and then your departure day. If the cottage needs approval, an admin confirms the stay.",
    ],
    link: { to: "/kalendar", label: ["Kalendář", "Calendar"] },
  },
  {
    q: ["Zapomněl(a) jsem heslo.", "I forgot my password."],
    a: [
      "Na přihlašovací stránce zvolte Zapomenuté heslo. Pošleme odkaz, po kliknutí si zvolíte nové heslo. Funguje i pro účty založené přes Google.",
      "On the sign-in page choose Forgot password. We e-mail a link; after clicking it you choose a new password. This also works for accounts made with Google.",
    ],
  },
  {
    q: ["Jak vypnu veřejný kalendář?", "How do I switch the public calendar off?"],
    a: [
      "Správce v Nastavení zvolí Vypnout veřejný kalendář. Sdílený odkaz přestane fungovat hned; tlačítkem Veřejný odkaz na kalendář ho lze znovu zapnout.",
      "An admin chooses Switch off the public calendar in Settings. The shared link stops working at once; Public calendar link switches it on again.",
    ],
  },
  {
    q: ["Kdo vidí moje údaje?", "Who sees my data?"],
    a: [
      "Jen členové vaší chaty, podle svých oprávnění. Co sbíráme a jaké cookies používáme, najdete v Soukromí a cookies.",
      "Only your cottage's members, as their permissions allow. What we collect and which cookies we use is in Privacy & cookies.",
    ],
    link: { to: "/soukromi", label: ["Soukromí a cookies", "Privacy & cookies"] },
  },
];

function HelpPage() {
  const { t } = useLang();
  const { user } = useAccount();
  const [open, setOpen] = useState<number | null>(null);

  // A problem report starts with what support needs to reproduce it, never the person's data.
  const reportHref = () => {
    const lines = [
      t("Co se stalo:", "What happened:"),
      "",
      t("Co jsem čekal(a):", "What I expected:"),
      "",
      "---",
      `${t("Verze", "Version")}: ${BUILD_SHA} (${BUILD_TIME})`,
      `${t("Prohlížeč", "Browser")}: ${typeof navigator === "undefined" ? "" : navigator.userAgent}`,
    ];
    const subject = t("Problém v My Chata", "Problem in My Chata");
    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
  };

  return (
    <AppShell>
      <PageHeader title={t("Nápověda a podpora", "Help & support")} back="/vice" />

      <section className="card divide-y divide-divider overflow-hidden px-4 py-1">
        <h3 className="py-3 text-lg font-bold">{t("Časté otázky", "Common questions")}</h3>
        {FAQS.map((f, i) => {
          const expanded = open === i;
          return (
            <div key={f.q[1]}>
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : i)}
                className="flex min-h-[60px] w-full items-center gap-3 py-3 text-left text-[16px] font-bold"
              >
                <span className="flex-1">{t(...f.q)}</span>
                <ChevronDown
                  className={`size-5 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
                />
              </button>
              {expanded && (
                <div className="space-y-2 pb-4 text-[16px] text-muted-foreground">
                  <p>{t(...f.a)}</p>
                  {f.link && user && (
                    <Link
                      to={f.link.to}
                      className="inline-flex min-h-11 items-center font-semibold text-primary underline underline-offset-2"
                    >
                      {t(...f.link.label)}
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section className="card mt-4 space-y-3 p-4">
        <h3 className="text-lg font-bold">{t("Napište nám", "Contact us")}</h3>
        <p className="text-[16px] text-muted-foreground">
          {t(
            "Nenašli jste odpověď nebo něco nefunguje? Napište nám.",
            "Didn't find the answer, or something isn't working? Write to us.",
          )}
        </p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="btn-primary flex min-h-[56px] w-full items-center justify-center gap-2 text-[17px]"
        >
          <Mail className="size-5" />
          {SUPPORT_EMAIL}
        </a>
        <a
          href={reportHref()}
          className="btn-secondary flex min-h-[56px] w-full items-center justify-center gap-2 text-[17px]"
        >
          <MessageSquareWarning className="size-5" />
          {t("Nahlásit problém", "Report a problem")}
        </a>
        <p className="text-[14px] text-muted-foreground">
          {t(
            "Zpráva o problému předvyplní verzi aplikace a prohlížeč. Hesla ani osobní údaje do ní nepište.",
            "A problem report fills in the app version and browser. Don't put passwords or personal data in it.",
          )}
        </p>
      </section>

      <p className="mt-4 text-center text-[14px] text-muted-foreground">
        {t("Verze", "Version")} {BUILD_SHA.slice(0, 7)}
        {BUILD_TIME === "unknown" ? "" : ` · ${fmtDateTime(BUILD_TIME)}`}
      </p>
    </AppShell>
  );
}
