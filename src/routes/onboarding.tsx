import { Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBrand } from "@/lib/brand";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { LanguageToggle, useLang } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { pendingInvite } from "@/lib/pending-invite";
import { isPublicEmailDomain, signupMetadata } from "@/lib/signup";

export const Route = createFileRoute("/onboarding")({
  staticData: { sitemap: false },
  head: () => ({
    meta: [
      { title: "Nastavení chaty — My Chata" },
      { property: "og:title", content: "Nastavení chaty — My Chata" },
      {
        property: "og:description",
        content: "Nastavte svou chatu v několika jednoduchých krocích.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "description", content: "Nastavte svou chatu v několika jednoduchých krocích." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

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

  // Someone who signed up from an invitation link joins that account instead of creating
  // a new one (B-013).
  useEffect(() => {
    const token = pendingInvite();
    if (token) navigate({ to: "/pozvanka/$token", params: { token }, replace: true });
  }, [navigate]);
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  // Family or institution is decided at sign-up (T-021): "Sign up as an Institute" stores
  // signup_kind "institution"; every other sign-up (Google, personal email) is a family.
  const [type, setType] = useState<"FAMILY" | "INSTITUTIONAL">("FAMILY");
  useBrand(type === "INSTITUTIONAL" ? "institution" : "family");
  const [accountName, setAccountName] = useState("");
  // Name from Google, or from the email sign-up form; always editable (T-021).
  const [fullName, setFullName] = useState("");
  const signup = signupMetadata(user?.user_metadata);
  useEffect(() => {
    setFullName((current) => current || profile?.display_name || signup.fullName || "");
    if (signup.kind === "institution") {
      setType("INSTITUTIONAL");
      setAccountName((current) => current || signup.organisation || "");
    }
  }, [profile?.display_name, signup.fullName, signup.kind, signup.organisation]);
  const [chatas, setChatas] = useState<ChataDraft[]>([
    { name: "", address: "", city: "", rooms: "" },
  ]);
  const [peopleCount, setPeopleCount] = useState("");
  const [seasons, setSeasons] = useState<string[]>([]);
  const [overlapAllowed, setOverlapAllowed] = useState<boolean | null>(null);
  const [overlapMaxGuests, setOverlapMaxGuests] = useState("");
  const [houseRules, setHouseRules] = useState("");

  const email = user?.email ?? "";
  const institutionBlocked = type === "INSTITUTIONAL" && isPublicEmailDomain(email);

  const steps = [
    type === "INSTITUTIONAL" ? t("Organizace", "Organisation") : t("O vás", "About you"),
    t("Vaše chaty", "Your cottages"),
    t("Kdo ji používá", "Who uses it"),
    t("Pravidla rezervací", "Booking rules"),
    t("Pravidla domu", "House rules"),
  ];

  const finish = async () => {
    if (!user) return;
    setBusy(true);
    try {
      // The name goes on the profile first: the database uses it for the new member row.
      const { error: nameError } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, display_name: fullName.trim() }, { onConflict: "user_id" });
      if (nameError) throw nameError;
      const first = chatas[0]!;
      // Chatas can be added to the current account only by its admins. Anyone else
      // (new people, or plain members of someone else's account) gets their own account,
      // where they are admin. See B-003.
      const addToCurrentAccount =
        currentMember?.role === "ADMIN" || currentMember?.role === "OWNER";
      if (!addToCurrentAccount) {
        const { error } = await supabase.rpc("create_account_onboarding", {
          _type: type,
          _account_name: accountName || first.name || "My Chata",
          _property_name: first.name,
          _address: first.address,
          ...(first.city ? { _city: first.city } : {}),
          ...(first.rooms ? { _rooms: Number(first.rooms) } : {}),
          _seasons: seasons,
          ...(overlapAllowed && overlapMaxGuests
            ? { _overlap_max_guests: Number(overlapMaxGuests) }
            : {}),
          _house_rules: houseRules,
        });
        if (error) throw error;
      }
      // Remaining chatas (all of them when adding to the current account); creator is admin.
      for (const extra of addToCurrentAccount ? chatas : chatas.slice(1)) {
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
        {
          user_id: user.id,
          member_id: currentMember?.id ?? profile?.member_id ?? null,
          onboarding_completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (profileError) throw profileError;
      await supabase.from("onboarding_answers").upsert({
        user_id: user.id,
        answers: {
          type,
          peopleCount,
          seasons,
          overlapAllowed,
          overlapMaxGuests,
          chataCount: chatas.length,
        },
        updated_at: new Date().toISOString(),
      });
      track("onboarding_completed", {
        account_type: type === "FAMILY" ? "family" : "institution",
        property_count: chatas.length,
      });
      queryClient.clear();
      toast.success(t("Vítejte! Vaše chata je připravena.", "Welcome! Your cottage is ready."));
      navigate({ to: "/domu", replace: true });
    } catch (e) {
      const code = (e as { code?: string } | null)?.code;
      toast.error(
        code === "42501"
          ? t(
              "Nemáte oprávnění správce pro tento účet.",
              "You don't have admin rights for this account.",
            )
          : t("Něco se nepodařilo. Zkuste to znovu.", "Something went wrong. Please try again."),
      );
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const canNext =
    step === 0
      ? fullName.trim().length > 1 &&
        !institutionBlocked &&
        (type === "INSTITUTIONAL" ? accountName.trim().length > 1 : true)
      : step === 1
        ? chatas.every((c) => c.name.trim().length > 1)
        : step === 3
          ? chatas.every((c) => !c.rooms || Number(c.rooms) <= 3) || overlapAllowed !== null
          : true;

  return (
    <main className="mx-auto flex min-h-screen max-w-[420px] flex-col page-fresh px-5 py-5 md:max-w-[560px] md:py-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-[12px] bg-primary text-primary-foreground">
            <Home className="size-6" />
          </span>
          <span className="text-lg font-extrabold">My Chata</span>
        </div>
        <LanguageToggle />
      </div>

      <ol className="mt-6 flex gap-1.5">
        {steps.map((label, i) => (
          <li
            key={label}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-secondary"}`}
            aria-label={label}
          />
        ))}
      </ol>
      <p className="mt-3 text-[16px] font-semibold text-muted-foreground">
        {t("Krok", "Step")} {step + 1} / {steps.length} — {steps[step]}
      </p>

      <section className="mt-6 flex-1">
        {step === 0 && (
          <div className="space-y-3">
            <h1 className="text-[28px] font-extrabold leading-[1.15]">
              {type === "INSTITUTIONAL"
                ? t(
                    "Vítejte! Nastavíme vaši organizaci.",
                    "Welcome! Let's set up your organisation.",
                  )
                : t("Vítejte! Jak se jmenujete?", "Welcome! What's your name?")}
            </h1>
            <div
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              role="group"
              aria-label={t("Typ účtu", "Account type")}
            >
              <Button
                variant="fresh"
                size="fresh"
                className={`btn-secondary ${type === "FAMILY" ? "ring-2 ring-primary" : ""}`}
                aria-pressed={type === "FAMILY"}
                onClick={() => setType("FAMILY")}
              >
                {t("Rodina", "Family")}
              </Button>
              <Button
                variant="fresh"
                size="fresh"
                className={`btn-secondary ${type === "INSTITUTIONAL" ? "ring-2 ring-primary" : ""}`}
                aria-pressed={type === "INSTITUTIONAL"}
                onClick={() => setType("INSTITUTIONAL")}
              >
                {t("Instituce / Organizace", "Institution / Organisation")}
              </Button>
            </div>
            <label className="block">
              <span className="text-[16px] font-bold">{t("Vaše jméno", "Your name")}</span>
              <input
                className="field mt-1 w-full"
                placeholder={t("Jméno a příjmení", "First and last name")}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </label>
            {type === "INSTITUTIONAL" && (
              <label className="block">
                <span className="text-[16px] font-bold">
                  {t("Název organizace", "Organisation name")}
                </span>
                <input
                  className="field mt-1 w-full"
                  placeholder={t("Např. ZŠ Lipová", "E.g. Lipová Primary School")}
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  autoComplete="organization"
                />
              </label>
            )}
            {institutionBlocked && (
              <p className="rounded-2xl bg-warn-soft p-3 text-[16px] font-semibold text-warn-foreground">
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
            <h1 className="text-[28px] font-extrabold leading-[1.15]">
              {t("Jak se vaše chaty jmenují?", "What are your cottages called?")}
            </h1>
            <p className="text-[16px] text-muted-foreground">
              {t(
                "Kdo chatu přidá, stává se jejím správcem.",
                "Whoever adds a cottage becomes its admin.",
              )}
            </p>
            {chatas.map((c, i) => (
              <div key={i} className="card space-y-2 p-4">
                <input
                  className="field w-full"
                  placeholder={t("Název chaty", "Cottage name")}
                  value={c.name}
                  onChange={(e) =>
                    setChatas(chatas.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                />
                <input
                  className="field w-full"
                  placeholder={t("Adresa", "Address")}
                  value={c.address}
                  onChange={(e) =>
                    setChatas(
                      chatas.map((x, j) => (j === i ? { ...x, address: e.target.value } : x)),
                    )
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    className="field"
                    placeholder={t("Město", "City")}
                    value={c.city}
                    onChange={(e) =>
                      setChatas(
                        chatas.map((x, j) => (j === i ? { ...x, city: e.target.value } : x)),
                      )
                    }
                  />
                  <input
                    className="field"
                    type="number"
                    min={1}
                    placeholder={t("Pokoje", "Rooms")}
                    value={c.rooms}
                    onChange={(e) =>
                      setChatas(
                        chatas.map((x, j) => (j === i ? { ...x, rooms: e.target.value } : x)),
                      )
                    }
                  />
                </div>
              </div>
            ))}
            <Button
              variant="fresh"
              size="fresh"
              className="btn-secondary w-full"
              onClick={() => setChatas([...chatas, { name: "", address: "", city: "", rooms: "" }])}
            >
              {t("+ Přidat další chatu", "+ Add another cottage")}
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h1 className="text-[28px] font-extrabold leading-[1.15]">
              {t("Kolik lidí chatu používá?", "About how many people use it?")}
            </h1>
            <input
              className="field w-full"
              type="number"
              min={1}
              placeholder={t("Např. 8", "E.g. 8")}
              value={peopleCount}
              onChange={(e) => setPeopleCount(e.target.value)}
            />
            <p className="font-bold">{t("Máte rušná období?", "Any busy seasons?")}</p>
            <div className="flex flex-wrap gap-2">
              {SEASONS.map((s) => (
                <Button
                  variant="fresh"
                  size="fresh"
                  key={s.id}
                  onClick={() =>
                    setSeasons(
                      seasons.includes(s.id)
                        ? seasons.filter((x) => x !== s.id)
                        : [...seasons, s.id],
                    )
                  }
                  className={`pill min-h-[44px] px-4 ${seasons.includes(s.id) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                >
                  {lang === "cs" ? s.cs : s.en}
                </Button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h1 className="text-[28px] font-extrabold leading-[1.15]">
              {t("Mohou se pobyty překrývat?", "May stays overlap?")}
            </h1>
            {chatas.some((c) => c.rooms && Number(c.rooms) > 3) ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="fresh"
                    size="fresh"
                    className={`btn-secondary ${overlapAllowed === true ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setOverlapAllowed(true)}
                  >
                    {t("Ano", "Yes")}
                  </Button>
                  <Button
                    variant="fresh"
                    size="fresh"
                    className={`btn-secondary ${overlapAllowed === false ? "ring-2 ring-primary" : ""}`}
                    onClick={() => setOverlapAllowed(false)}
                  >
                    {t("Ne", "No")}
                  </Button>
                </div>
                {overlapAllowed && (
                  <input
                    className="field w-full"
                    type="number"
                    min={1}
                    placeholder={t(
                      "Max. hostů, nad které už rozhoduje správce",
                      "Max guests before admin approval",
                    )}
                    value={overlapMaxGuests}
                    onChange={(e) => setOverlapMaxGuests(e.target.value)}
                  />
                )}
              </>
            ) : (
              <p className="text-[16px] text-muted-foreground">
                {t(
                  "U menších chat se překryvy povolují automaticky — rodina se domluví sama.",
                  "For smaller cottages overlaps are allowed automatically — the family works it out.",
                )}
              </p>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h1 className="text-[28px] font-extrabold leading-[1.15]">
              {t("Pravidla domu", "House rules")}
            </h1>
            <textarea
              className="field min-h-40 w-full"
              placeholder={t(
                "Např. tichá noc od 22:00, boty u dveří…",
                "E.g. quiet hours after 10 pm, shoes at the door…",
              )}
              value={houseRules}
              onChange={(e) => setHouseRules(e.target.value)}
            />
            <p className="text-[16px] text-muted-foreground">
              {t(
                "Můžete doplnit i později v Manuálu chaty.",
                "You can also add them later in the House Manual.",
              )}
            </p>
          </div>
        )}
      </section>

      <div className="mt-6 flex flex-wrap justify-end gap-2 pb-6">
        {step > 0 ? (
          <Button
            variant="fresh"
            size="fresh"
            className="btn-secondary"
            onClick={() => setStep(step - 1)}
            disabled={busy}
          >
            {t("Zpět", "Back")}
          </Button>
        ) : (
          <span />
        )}
        {step < steps.length - 1 ? (
          <Button
            variant="fresh"
            size="fresh"
            className="btn-primary min-h-14 flex-1"
            disabled={!canNext}
            onClick={() => {
              track("onboarding_step", { step: step + 1 });
              setStep(step + 1);
            }}
          >
            {t("Pokračovat", "Continue")}
          </Button>
        ) : (
          <Button
            variant="fresh"
            size="fresh"
            className="btn-primary min-h-14 flex-1"
            disabled={busy || !canNext}
            onClick={finish}
          >
            {busy
              ? t("Zakládám…", "Setting up…")
              : t("Hotovo — otevřít chatu", "Done — open my cottage")}
          </Button>
        )}
      </div>
    </main>
  );
}
