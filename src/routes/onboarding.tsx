import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Building2, Check, Home } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { LanguageToggle, useLang } from "@/lib/i18n";
import { track } from "@/lib/analytics";

export const Route = createFileRoute("/onboarding")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Welcome — My Chata" },
      { name: "description", content: "Set up your cottage in a few simple steps." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

const PUBLIC_DOMAINS = ["gmail.com", "seznam.cz", "centrum.cz", "email.cz", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com"];
const SEASONS = [
  { id: "summer", cs: "Léto", en: "Summer" },
  { id: "winter", cs: "Zima", en: "Winter" },
  { id: "holidays", cs: "Svátky", en: "Holidays" },
] as const;

interface ChataDraft {
  name: string;
  address: string;
  city: string;
  rooms: string;
}

function OnboardingPage() {
  const { t, lang } = useLang();
  const { user, currentMember, profile } = useAccount();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<"FAMILY" | "INSTITUTIONAL" | null>(null);
  const [accountName, setAccountName] = useState("");
  const [chatas, setChatas] = useState<ChataDraft[]>([{ name: "", address: "", city: "", rooms: "" }]);
  const [peopleCount, setPeopleCount] = useState("");
  const [seasons, setSeasons] = useState<string[]>([]);
  const [overlapAllowed, setOverlapAllowed] = useState<boolean | null>(null);
  const [overlapMaxGuests, setOverlapMaxGuests] = useState("");
  const [houseRules, setHouseRules] = useState("");

  const email = user?.email ?? "";
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  const institutionBlocked = type === "INSTITUTIONAL" && PUBLIC_DOMAINS.includes(domain);

  const steps = [
    t("Typ účtu", "Account type"),
    t("Vaše chaty", "Your cottages"),
    t("Kdo ji používá", "Who uses it"),
    t("Pravidla rezervací", "Booking rules"),
    t("Pravidla domu", "House rules"),
  ];

  const finish = async () => {
    if (!type || !user) return;
    setBusy(true);
    try {
      const first = chatas[0]!;
      const alreadyMember = !!currentMember;
      if (!alreadyMember) {
        const { error } = await supabase.rpc("create_account_onboarding", {
          _type: type,
          _account_name: accountName || first.name || "My Chata",
          _property_name: first.name,
          _address: first.address,
          ...(first.city ? { _city: first.city } : {}),
          ...(first.rooms ? { _rooms: Number(first.rooms) } : {}),
          _seasons: seasons,
          ...(overlapAllowed && overlapMaxGuests ? { _overlap_max_guests: Number(overlapMaxGuests) } : {}),
          _house_rules: houseRules,
        });
        if (error) throw error;
      }
      // Remaining chatas (all of them for existing members): creator becomes admin of each.
      for (const extra of alreadyMember ? chatas : chatas.slice(1)) {
        if (!extra.name.trim()) continue;
        const { error: addError } = await supabase.rpc("add_property", {
          _name: extra.name,
          _address: extra.address,
          ...(extra.city ? { _city: extra.city } : {}),
          ...(extra.rooms ? { _rooms: Number(extra.rooms) } : {}),
        });
        if (addError) throw addError;
      }
      const { error: profileError } = await supabase.from("profiles").upsert(
        { user_id: user.id, member_id: currentMember?.id ?? profile?.member_id ?? null, onboarding_completed_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
      if (profileError) throw profileError;
      await supabase.from("onboarding_answers").upsert({
        user_id: user.id,
        answers: { type, peopleCount, seasons, overlapAllowed, overlapMaxGuests, chataCount: chatas.length },
        updated_at: new Date().toISOString(),
      });
      track("onboarding_completed", { account_type: type === "FAMILY" ? "family" : "institution", property_count: chatas.length });
      queryClient.clear();
      toast.success(t("Vítejte! Vaše chata je připravena.", "Welcome! Your cottage is ready."));
      navigate({ to: "/domu", replace: true });
    } catch (e) {
      toast.error(t("Něco se nepodařilo. Zkuste to znovu.", "Something went wrong. Please try again."));
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const canNext =
    step === 0
      ? !!type && !institutionBlocked && (type === "INSTITUTIONAL" ? accountName.trim().length > 1 : true)
      : step === 1
        ? chatas.every((c) => c.name.trim().length > 1)
        : step === 3
          ? chatas.every((c) => !c.rooms || Number(c.rooms) <= 3) || overlapAllowed !== null
          : true;

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col bg-background p-4">
      <div className="flex items-center justify-between">
        <p className="font-bold text-primary">My Chata</p>
        <LanguageToggle />
      </div>

      <ol className="mt-6 flex gap-1.5">
        {steps.map((label, i) => (
          <li key={label} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`} aria-label={label} />
        ))}
      </ol>
      <p className="mt-3 text-[14px] font-semibold text-muted-foreground">
        {t("Krok", "Step")} {step + 1} / {steps.length} — {steps[step]}
      </p>

      <section className="mt-6 flex-1">
        {step === 0 && (
          <div className="space-y-3">
            <h1 className="text-2xl font-bold">{t("Kdo bude chatu spravovat?", "Who will manage the cottage?")}</h1>
            <button onClick={() => setType("FAMILY")} className={`card flex w-full items-center gap-3 p-4 text-left ${type === "FAMILY" ? "ring-2 ring-primary" : ""}`}>
              <Home className="size-6 text-primary" />
              <div>
                <p className="font-bold">{t("Rodina", "Family")}</p>
                <p className="text-[14px] text-muted-foreground">{t("Sdílená chata pro rodinu a přátele.", "A shared cottage for family and friends.")}</p>
              </div>
              {type === "FAMILY" && <Check className="ml-auto size-5 text-primary" />}
            </button>
            <button onClick={() => setType("INSTITUTIONAL")} className={`card flex w-full items-center gap-3 p-4 text-left ${type === "INSTITUTIONAL" ? "ring-2 ring-primary" : ""}`}>
              <Building2 className="size-6 text-primary" />
              <div>
                <p className="font-bold">{t("Organizace", "Institution")}</p>
                <p className="text-[14px] text-muted-foreground">{t("Škola, firma nebo spolek.", "A school, company or club.")}</p>
              </div>
              {type === "INSTITUTIONAL" && <Check className="ml-auto size-5 text-primary" />}
            </button>
            {type === "INSTITUTIONAL" && (
              <input
                className="field mt-2 w-full"
                placeholder={t("Název organizace", "Organisation name")}
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            )}
            {institutionBlocked && (
              <p className="rounded-2xl bg-warn-soft p-3 text-[14px] font-semibold text-warn">
                {t(
                  "Pro organizaci se přihlaste pracovním e-mailem (např. @vase-skola.cz), ne veřejnou schránkou.",
                  "For an institution, sign in with a work email (e.g. @your-school.cz), not a public mailbox.",
                )}
              </p>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">{t("Jak se vaše chaty jmenují?", "What are your cottages called?")}</h1>
            <p className="text-[14px] text-muted-foreground">
              {t("Kdo chatu přidá, stává se jejím správcem.", "Whoever adds a cottage becomes its admin.")}
            </p>
            {chatas.map((c, i) => (
              <div key={i} className="card space-y-2 p-4">
                <input className="field w-full" placeholder={t("Název chaty", "Cottage name")} value={c.name} onChange={(e) => setChatas(chatas.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <input className="field w-full" placeholder={t("Adresa", "Address")} value={c.address} onChange={(e) => setChatas(chatas.map((x, j) => (j === i ? { ...x, address: e.target.value } : x)))} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="field" placeholder={t("Město", "City")} value={c.city} onChange={(e) => setChatas(chatas.map((x, j) => (j === i ? { ...x, city: e.target.value } : x)))} />
                  <input className="field" type="number" min={1} placeholder={t("Pokoje", "Rooms")} value={c.rooms} onChange={(e) => setChatas(chatas.map((x, j) => (j === i ? { ...x, rooms: e.target.value } : x)))} />
                </div>
              </div>
            ))}
            <button className="btn-secondary w-full" onClick={() => setChatas([...chatas, { name: "", address: "", city: "", rooms: "" }])}>
              {t("+ Přidat další chatu", "+ Add another cottage")}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">{t("Kolik lidí chatu používá?", "About how many people use it?")}</h1>
            <input className="field w-full" type="number" min={1} placeholder={t("Např. 8", "E.g. 8")} value={peopleCount} onChange={(e) => setPeopleCount(e.target.value)} />
            <p className="font-bold">{t("Máte rušná období?", "Any busy seasons?")}</p>
            <div className="flex flex-wrap gap-2">
              {SEASONS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSeasons(seasons.includes(s.id) ? seasons.filter((x) => x !== s.id) : [...seasons, s.id])}
                  className={`pill min-h-[44px] px-4 ${seasons.includes(s.id) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                >
                  {lang === "cs" ? s.cs : s.en}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">{t("Mohou se pobyty překrývat?", "May stays overlap?")}</h1>
            {chatas.some((c) => c.rooms && Number(c.rooms) > 3) ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button className={`btn-secondary ${overlapAllowed === true ? "ring-2 ring-primary" : ""}`} onClick={() => setOverlapAllowed(true)}>
                    {t("Ano", "Yes")}
                  </button>
                  <button className={`btn-secondary ${overlapAllowed === false ? "ring-2 ring-primary" : ""}`} onClick={() => setOverlapAllowed(false)}>
                    {t("Ne", "No")}
                  </button>
                </div>
                {overlapAllowed && (
                  <input
                    className="field w-full"
                    type="number"
                    min={1}
                    placeholder={t("Max. hostů, nad které už rozhoduje správce", "Max guests before admin approval")}
                    value={overlapMaxGuests}
                    onChange={(e) => setOverlapMaxGuests(e.target.value)}
                  />
                )}
              </>
            ) : (
              <p className="text-[15px] text-muted-foreground">
                {t("U menších chat se překryvy povolují automaticky — rodina se domluví sama.", "For smaller cottages overlaps are allowed automatically — the family works it out.")}
              </p>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h1 className="text-2xl font-bold">{t("Pravidla domu", "House rules")}</h1>
            <textarea
              className="field min-h-40 w-full"
              placeholder={t("Např. tichá noc od 22:00, boty u dveří…", "E.g. quiet hours after 10 pm, shoes at the door…")}
              value={houseRules}
              onChange={(e) => setHouseRules(e.target.value)}
            />
            <p className="text-[14px] text-muted-foreground">{t("Můžete doplnit i později v Manuálu chaty.", "You can also add them later in the House Manual.")}</p>
          </div>
        )}
      </section>

      <div className="grid grid-cols-2 gap-2 pb-6">
        {step > 0 ? (
          <button className="btn-secondary" onClick={() => setStep(step - 1)} disabled={busy}>
            {t("Zpět", "Back")}
          </button>
        ) : (
          <span />
        )}
        {step < steps.length - 1 ? (
          <button className="btn-primary" disabled={!canNext} onClick={() => { track("onboarding_step", { step: step + 1 }); setStep(step + 1); }}>
            {t("Pokračovat", "Continue")}
          </button>
        ) : (
          <button className="btn-primary" disabled={busy || !canNext} onClick={finish}>
            {busy ? t("Zakládám…", "Setting up…") : t("Hotovo — otevřít chatu", "Done — open my cottage")}
          </button>
        )}
      </div>
    </main>
  );
}
