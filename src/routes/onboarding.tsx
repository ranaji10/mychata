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
import { pendingCalendar } from "@/lib/pending-booking";
import { isPublicEmailDomain, signupMetadata } from "@/lib/signup";
import { hasPassword } from "@/lib/password";
import { forgetPersonalEmail, personalEmailToLink } from "@/lib/institution-link";
import { inviteLink } from "@/lib/invites";
import { accountNameFromEmail, sameName } from "@/lib/account-label";
import { SetPasswordForm } from "@/components/SetPasswordForm";
import { AutoApproveChoice } from "@/components/AutoApproveChoice";

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
  // From My profile (bug 5): ?kind=institution starts an organisation; ?fresh=1 makes a new
  // account even for someone who already runs one (otherwise cottages join the open account).
  validateSearch: (search: Record<string, unknown>): { kind?: "institution"; fresh?: boolean } => ({
    ...(search["kind"] === "institution" ? { kind: "institution" as const } : {}),
    ...(search["fresh"] ? { fresh: true } : {}),
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
  const { user, currentMember, profile, memberships } = useAccount();
  const navigate = useNavigate();
  const search = Route.useSearch();
  // After the cottage is made: offer a password to Google sign-ups (bug 4a) and show the
  // invitation for a linked personal email (bug 5). null = still setting up.
  const [done, setDone] = useState<{ linkEmail: string | null; linkUrl: string | null } | null>(
    null,
  );

  // Someone who signed up from an invitation link joins that account instead of creating
  // a new one (B-013).
  useEffect(() => {
    const token = pendingInvite();
    if (token) {
      navigate({ to: "/pozvanka/$token", params: { token }, replace: true });
      return;
    }
    // Signed up from a public calendar's "Request a booking" (T-043): finish that first.
    const calendar = pendingCalendar();
    if (calendar)
      navigate({ to: "/verejne/kalendar/$token", params: { token: calendar }, replace: true });
  }, [navigate]);
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  // Family or institution is decided at sign-up (T-021): "Sign up as an Institute" stores
  // signup_kind "institution"; every other sign-up (Google, personal email) is a family.
  const [type, setType] = useState<"FAMILY" | "INSTITUTIONAL">(
    search.kind === "institution" ? "INSTITUTIONAL" : "FAMILY",
  );
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
  // Organisations answer "Auto booking approval" (T-042); null = not answered yet.
  const [autoApprove, setAutoApprove] = useState<boolean | null>(null);

  const email = user?.email ?? "";
  // A family account gets its own name, not the first cottage's (T-042); start from the part
  // of the email before the @, which the person can change.
  useEffect(() => {
    if (type === "FAMILY" && email)
      setAccountName((current) => current || accountNameFromEmail(email));
  }, [type, email]);
  // Chatas can be added to the current account only by its admins. Anyone else
  // (new people, or plain members of someone else's account) gets their own account,
  // where they are admin. See B-003.
  const addToCurrentAccount =
    !search.fresh && (currentMember?.role === "ADMIN" || currentMember?.role === "OWNER");
  const familyNameClash =
    !addToCurrentAccount && type === "FAMILY" && sameName(accountName, chatas[0]?.name ?? "");
  const institutionBlocked = type === "INSTITUTIONAL" && isPublicEmailDomain(email);

  const steps = [
    type === "INSTITUTIONAL" ? t("Organizace", "Organisation") : t("O vás", "About you"),
    t("Vaše chaty", "Your cottages"),
    t("Kdo ji používá", "Who uses it"),
    t("Pravidla rezervací", "Booking rules"),
    t("Pravidla domu", "House rules"),
  ];

  // Set up already (26 Oct edge case): someone who belongs to an account and didn't ask for a
  // new one ("fresh" or an organisation) has nothing to do here. A second tab left on step 1
  // after finishing in another tab would otherwise add the cottage a second time.
  const [setUpElsewhere, setSetUpElsewhere] = useState(false);
  // Set when this tab created the account, so the guard never shows on the way to Home
  // (PR #77 review: it could flash while Home loaded, offering a second account).
  const [finished, setFinished] = useState(false);
  const alreadySetUp = (setUpElsewhere || memberships.length > 0) && !search.fresh && !search.kind;

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[onboarding] sign out", error);
      toast.error(t("Odhlášení se nepodařilo.", "Could not sign out."));
      return;
    }
    queryClient.clear();
    try {
      localStorage.removeItem("mychata.offline-cache");
    } catch {
      /* storage blocked: nothing was saved either */
    }
    navigate({ to: "/auth", replace: true });
  };

  const finish = async () => {
    if (!user) return;
    setBusy(true);
    try {
      if (!search.fresh && !search.kind) {
        const { data: existing, error: existingError } = await supabase
          .from("members")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        if (existingError) throw existingError;
        if (existing?.length) {
          setSetUpElsewhere(true);
          return;
        }
      }
      // The name goes on the profile first: the database uses it for the new member row.
      const { error: nameError } = await supabase
        .from("profiles")
        .upsert({ user_id: user.id, display_name: fullName.trim() }, { onConflict: "user_id" });
      if (nameError) throw nameError;
      const first = chatas[0]!;
      const newPropertyIds: string[] = [];
      if (!addToCurrentAccount) {
        const { data: firstId, error } = await supabase.rpc("create_account_onboarding", {
          _type: type,
          _account_name:
            accountName.trim() || (type === "FAMILY" ? t("Moje rodina", "My family") : first.name),
          _property_name: first.name.trim(),
          _address: first.address,
          ...(first.city ? { _city: first.city } : {}),
          ...(first.rooms ? { _rooms: Number(first.rooms) } : {}),
          _seasons: seasons,
          ...(overlapAllowed && overlapMaxGuests
            ? { _overlap_max_guests: Number(overlapMaxGuests) }
            : {}),
          _house_rules: houseRules,
          ...(type === "INSTITUTIONAL" && autoApprove !== null
            ? { _booking_auto_approve: autoApprove }
            : {}),
        });
        if (error) throw error;
        if (firstId) newPropertyIds.push(firstId as string);
      }
      // Remaining chatas (all of them when adding to the current account); creator is admin.
      for (const extra of addToCurrentAccount ? chatas : chatas.slice(1)) {
        if (!extra.name.trim()) continue;
        const { data: extraId, error: addError } = await supabase.rpc("add_property", {
          _name: extra.name.trim(),
          _address: extra.address,
          ...(extra.city ? { _city: extra.city } : {}),
          ...(extra.rooms ? { _rooms: Number(extra.rooms) } : {}),
        });
        if (addError) throw addError;
        if (extraId) newPropertyIds.push(extraId as string);
      }
      // "May stays overlap?" is an answer even when it's No (bug 8). The cottages exist by
      // now, so a failure here is logged, not shown: My profile can still ask again.
      if (overlapAllowed !== null) {
        for (const id of newPropertyIds) {
          const { error: overlapError } = await supabase.rpc("set_property_overlap", {
            _property_id: id,
            _allowed: overlapAllowed,
            ...(overlapAllowed && overlapMaxGuests
              ? { _max_guests: Number(overlapMaxGuests) }
              : {}),
          });
          if (overlapError) {
            console.error("[onboarding] overlap answer", overlapError);
            toast.error(
              t(
                "Odpověď na překrývání pobytů se neuložila. Nastavte ji v Nastavení.",
                "The overlapping-stays answer was not saved. Set it in Settings.",
              ),
            );
          }
        }
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
      const { error: answersError } = await supabase.from("onboarding_answers").upsert({
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
      // The cottage and profile are already saved at this point, so a failed answers save
      // must not stop the user (a retry would create a second cottage). Log it instead.
      if (answersError) console.error("onboarding_answers upsert failed", answersError);
      track("onboarding_completed", {
        account_type: type === "FAMILY" ? "family" : "institution",
        property_count: chatas.length,
      });
      // Bug 5: an institution set up by someone who started from a personal sign-in invites
      // that personal email as an admin, so one sign-in reaches both.
      let linkEmail: string | null = null;
      let linkUrl: string | null = null;
      const personal = type === "INSTITUTIONAL" ? personalEmailToLink(user.email) : null;
      if (personal) {
        const { data: accountId, error: accountError } = await supabase.rpc("current_account_id");
        const { data: me, error: meError } = accountError
          ? { data: null, error: accountError }
          : await supabase
              .from("members")
              .select("id")
              .eq("account_id", accountId as string)
              .eq("user_id", user.id)
              .maybeSingle();
        const token = crypto.randomUUID();
        const { error: inviteError } =
          accountError || meError || !accountId
            ? { error: accountError ?? meError ?? new Error("no account") }
            : await supabase.from("invitations").insert({
                account_id: accountId as string,
                email: personal,
                role: "ADMIN",
                token,
                created_by_member_id: me?.id ?? null,
              });
        if (inviteError) {
          console.error("[onboarding] invite personal email", inviteError);
          toast.error(
            t(
              `Pozvánku pro ${personal} se nepodařilo vytvořit. Pozvěte ji v Členech.`,
              `Could not create the invitation for ${personal}. Invite it from Members.`,
            ),
          );
        } else {
          linkEmail = personal;
          linkUrl = inviteLink(window.location.origin, token);
          forgetPersonalEmail();
        }
      }
      queryClient.clear();
      toast.success(t("Vítejte! Vaše chata je připravena.", "Welcome! Your cottage is ready."));
      setFinished(true);
      if (linkEmail || !hasPassword(user)) setDone({ linkEmail, linkUrl });
      else navigate({ to: "/domu", replace: true });
    } catch (e) {
      const code = (e as { code?: string } | null)?.code;
      const message = (e as { message?: string } | null)?.message ?? "";
      toast.error(
        message.includes("account_name_same_as_cottage")
          ? t(
              "Účet a první chata nesmí mít stejný název. Změňte název účtu v prvním kroku.",
              "The account and its first cottage can't have the same name. Change the account name in the first step.",
            )
          : code === "42501"
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
        (addToCurrentAccount || accountName.trim().length > 1)
      : step === 1
        ? chatas.every((c) => c.name.trim().length > 1) && !familyNameClash
        : step === 3
          ? (chatas.every((c) => !c.rooms || Number(c.rooms) <= 3) || overlapAllowed !== null) &&
            (type !== "INSTITUTIONAL" || addToCurrentAccount || autoApprove !== null)
          : true;

  if (alreadySetUp && !done && !busy && !finished) {
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
        <section className="card mt-10 space-y-3 p-5">
          <h1 className="text-[28px] font-extrabold leading-[1.15]">
            {t("Nastavení je hotové", "You're all set up")}
          </h1>
          <p className="text-[16px] text-muted-foreground">
            {t(
              "Váš účet už existuje, třeba jste nastavení dokončili v jiném okně. Pokračujte domů.",
              "Your account already exists; maybe you finished setting up in another window. Continue to Home.",
            )}
          </p>
          <Button
            variant="fresh"
            size="fresh"
            className="btn-primary min-h-[56px] w-full text-[17px]"
            onClick={() => navigate({ to: "/domu", replace: true })}
          >
            {t("Přejít domů", "Go to Home")}
          </Button>
          <Button
            variant="fresh"
            size="fresh"
            className="btn-secondary w-full"
            onClick={() => {
              setSetUpElsewhere(false);
              navigate({ to: "/onboarding", search: { fresh: true }, replace: true });
            }}
          >
            {t("Založit další, samostatný účet", "Create another, separate account")}
          </Button>
        </section>
      </main>
    );
  }

  if (done) {
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
        <h1 className="mt-8 text-[28px] font-extrabold leading-[1.15]">
          {t("Vaše chata je připravená.", "Your cottage is ready.")}
        </h1>
        {done.linkEmail && done.linkUrl && (
          <section className="card mt-5 space-y-2 p-4">
            <h2 className="text-lg font-bold">
              {t("Propojte svůj osobní účet", "Link your personal account")}
            </h2>
            <p className="text-[16px]">
              {t(
                `Pozvali jsme ${done.linkEmail} jako správce. Otevřete tento odkaz po přihlášení osobním e-mailem a obě chaty pak přepnete v jednom přihlášení.`,
                `We invited ${done.linkEmail} as an admin. Open this link when signed in with your personal email, and you'll switch between both cottages from one sign-in.`,
              )}
            </p>
            <Button
              variant="fresh"
              size="fresh"
              className="btn-secondary w-full"
              onClick={() => {
                void navigator.clipboard
                  .writeText(done.linkUrl!)
                  .then(() => toast.success(t("Odkaz zkopírován.", "Link copied.")))
                  .catch(() => toast.error(done.linkUrl!));
              }}
            >
              {t("Zkopírovat odkaz", "Copy the link")}
            </Button>
          </section>
        )}
        {!hasPassword(user) && (
          <section className="card mt-5 space-y-2 p-4">
            <h2 className="text-lg font-bold">
              {t("Chcete si nastavit heslo?", "Would you like a password?")}
            </h2>
            <p className="text-[16px] text-muted-foreground">
              {t(
                "Registrovali jste se přes Google. S heslem se přihlásíte i e-mailem, třeba na cizím zařízení. Můžete ho nastavit i později v Mém profilu.",
                "You signed up with Google. With a password you can also sign in with your email, e.g. on someone else's device. You can also set it later in My profile.",
              )}
            </p>
            <SetPasswordForm onDone={() => navigate({ to: "/domu", replace: true })} />
          </section>
        )}
        <Button
          variant="fresh"
          size="fresh"
          className="btn-primary mt-5 min-h-14 w-full"
          onClick={() => navigate({ to: "/domu", replace: true })}
        >
          {hasPassword(user)
            ? t("Otevřít chatu", "Open my cottage")
            : t("Teď ne — otevřít chatu", "Not now — open my cottage")}
        </Button>
      </main>
    );
  }

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
            <label className="block">
              <span className="text-[16px] font-bold">{t("Vaše jméno", "Your name")}</span>
              <input
                className="field mt-1 w-full"
                placeholder={t("Jméno a příjmení", "First and last name")}
                aria-label={t("Jméno a příjmení", "First and last name")}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </label>
            {type === "FAMILY" && !addToCurrentAccount && (
              <label className="block">
                <span className="text-[16px] font-bold">{t("Název účtu", "Account name")}</span>
                <input
                  className="field mt-1 w-full"
                  placeholder={t("Např. Novákovi", "E.g. The Novák family")}
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                />
                <span className="mt-1 block text-[15px] text-muted-foreground">
                  {t(
                    "Pod tímto názvem budou všechny vaše chaty. Chata pak dostane vlastní název.",
                    "All your cottages sit under this name. Each cottage gets its own name next.",
                  )}
                </span>
              </label>
            )}
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
                {i > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[16px] font-bold text-muted-foreground">
                      {t(`Chata ${i + 1}`, `Cottage ${i + 1}`)}
                    </span>
                    <Button
                      variant="fresh"
                      size="fresh"
                      className="min-h-11 px-2 text-[16px] font-semibold text-muted-foreground"
                      onClick={() => setChatas(chatas.filter((_, j) => j !== i))}
                    >
                      {t("Odebrat", "Remove")}
                    </Button>
                  </div>
                )}
                <input
                  className="field w-full"
                  placeholder={t("Název chaty", "Cottage name")}
                  aria-label={t("Název chaty", "Cottage name")}
                  value={c.name}
                  onChange={(e) =>
                    setChatas(chatas.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                />
                <input
                  className="field w-full"
                  placeholder={t("Adresa", "Address")}
                  aria-label={t("Adresa", "Address")}
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
                    aria-label={t("Město", "City")}
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
                    aria-label={t("Pokoje", "Rooms")}
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
            {familyNameClash && (
              <p className="rounded-2xl bg-warn-soft p-3 text-[16px] font-semibold text-warn-foreground">
                {t(
                  `Chata se nemůže jmenovat stejně jako účet („${accountName.trim()}“). Zvolte jiný název chaty, nebo se vraťte a změňte název účtu.`,
                  `The cottage can't have the same name as the account ("${accountName.trim()}"). Pick another cottage name, or go back and change the account name.`,
                )}
              </p>
            )}
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
            {type === "INSTITUTIONAL" && !addToCurrentAccount && (
              <AutoApproveChoice value={autoApprove} onChange={setAutoApprove} />
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
        ) : memberships.length > 0 ? (
          // Came from My profile or Add a cottage for a new account: a way back (26 Oct).
          <Button
            variant="fresh"
            size="fresh"
            className="btn-secondary"
            onClick={() => navigate({ to: "/profil" })}
          >
            {t("Zrušit", "Cancel")}
          </Button>
        ) : (
          // Someone who only came to ask for a stay on a public calendar had no way out of
          // onboarding (26 Oct): they can sign out instead.
          <Button
            variant="fresh"
            size="fresh"
            className="btn-secondary"
            onClick={() => void signOut()}
          >
            {t("Odhlásit se", "Sign out")}
          </Button>
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
