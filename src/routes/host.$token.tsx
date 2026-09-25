import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";
import { getGuestLinkInfo, submitGuestRequest } from "@/lib/guest.functions";
import { LanguageToggle, useLang } from "@/lib/i18n";
import { fmtDate } from "@/lib/data";

export const Route = createFileRoute("/host/$token")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [{ title: "Guest booking — My Chata" }, { name: "robots", content: "noindex" }],
  }),
  component: GuestBookingPage,
});

function GuestBookingPage() {
  const { token } = Route.useParams();
  const { t, lang } = useLang();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [guests, setGuests] = useState("2");
  const [note, setNote] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["guest-link", token],
    queryFn: () => getGuestLinkInfo({ data: { token } }),
  });

  if (isLoading) return <main className="mx-auto min-h-screen max-w-[420px] bg-background p-4" />;
  if (!data)
    return (
      <main className="mx-auto flex min-h-screen max-w-[420px] flex-col items-center justify-center bg-background p-4 text-center">
        <h1 className="text-2xl font-bold">
          {t("Tento odkaz už neplatí.", "This link is no longer valid.")}
        </h1>
      </main>
    );

  const submit = async () => {
    setBusy(true);
    const res = await submitGuestRequest({
      data: {
        token,
        name,
        email,
        startDate: start,
        endDate: end,
        guests: Number(guests),
        note: note || undefined,
        company: company || undefined,
      },
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      return;
    }
    const messages: Record<string, string> = {
      link: t("Tento odkaz už neplatí.", "This link is no longer valid."),
      dates: t("Zkontrolujte prosím termín.", "Please check the dates."),
      guests: t("Zkontrolujte počet hostů.", "Please check the number of guests."),
      name: t("Vyplňte prosím jméno.", "Please enter your name."),
      email: t("Zkontrolujte e-mail.", "Please check the email address."),
      rate: t(
        "Dnes už bylo odesláno příliš mnoho žádostí. Zkuste to zítra.",
        "Too many requests today. Please try again tomorrow.",
      ),
      save: t("Žádost se nepodařilo odeslat.", "The request could not be sent."),
    };
    setFailure(messages[res.error] ?? messages["save"]!);
  };

  return (
    <main className="mx-auto min-h-screen max-w-[420px] bg-background p-4 pb-16">
      <div className="flex justify-end">
        <LanguageToggle />
      </div>
      <p className="mt-6 font-bold text-primary">My Chata</p>
      <h1 className="mt-1 text-2xl font-bold">{data.propertyName}</h1>
      {data.propertyAddress && (
        <p className="text-[15px] text-muted-foreground">{data.propertyAddress}</p>
      )}

      {done ? (
        <div className="card mt-6 p-5 text-center">
          <p className="text-lg font-bold">
            {t("Děkujeme! Žádost byla odeslána.", "Thank you! Your request was sent.")}
          </p>
          <p className="mt-2 text-[15px] text-muted-foreground">
            {t("Správce chaty vám odpoví e-mailem.", "The cottage admin will reply by email.")}
          </p>
        </div>
      ) : (
        <>
          <div className="card mt-4 p-4">
            <h2 className="flex items-center gap-2 font-bold">
              <CalendarDays className="size-5 text-primary" />
              {t("Obsazené termíny", "Booked dates")}
            </h2>
            {data.availability.length === 0 ? (
              <p className="mt-2 text-[15px] text-muted-foreground">
                {t("Zatím je vše volné.", "Everything is free so far.")}
              </p>
            ) : (
              <ul className="mt-2 space-y-1 text-[15px]">
                {data.availability.map((b) => (
                  <li key={`${b.start_date}-${b.end_date}`} className="flex justify-between">
                    <span>
                      {fmtDate(b.start_date)} – {fmtDate(b.end_date)}
                    </span>
                    <span
                      className={`pill ${b.status === "CONFIRMED" ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}
                    >
                      {b.status === "CONFIRMED" ? t("Obsazeno", "Booked") : t("Čeká", "Pending")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card mt-4 space-y-3 p-4">
            <input
              className="field w-full"
              placeholder={t("Vaše jméno", "Your name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="field w-full"
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[13px] font-bold text-muted-foreground">
                  {t("Od", "From")}
                </span>
                <input
                  className="field mt-1 w-full"
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-[13px] font-bold text-muted-foreground">{t("Do", "To")}</span>
                <input
                  className="field mt-1 w-full"
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
            </div>
            <input
              className="field w-full"
              type="number"
              min={1}
              max={50}
              placeholder={t("Počet hostů", "Number of guests")}
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
            />
            <textarea
              className="field min-h-20 w-full"
              placeholder={t("Poznámka (nepovinné)", "Note (optional)")}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <input
              className="hidden"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <button
              className="btn-primary w-full"
              disabled={busy || name.trim().length < 2 || !email.includes("@") || !start || !end}
              onClick={submit}
            >
              {busy ? t("Odesílám…", "Sending…") : t("Odeslat žádost", "Send request")}
            </button>
            {failure && (
              <p role="alert" className="text-center text-[14px] font-semibold text-destructive">
                {failure}
              </p>
            )}
            <p className="text-center text-[13px] text-muted-foreground">
              {t("Bez registrace — stačí vyplnit.", "No account needed — just fill it in.")}
            </p>
          </div>
        </>
      )}
    </main>
  );
}
