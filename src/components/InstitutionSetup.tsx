import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/account";
import { useLang } from "@/lib/i18n";
import { rememberPersonalEmail } from "@/lib/institution-link";
import { isPublicEmailDomain } from "@/lib/signup";

type Choice = "convert" | "new";

/**
 * "Add an institutional account" on My profile (bugs 5 and 6, 17 Oct 2026).
 * - Work email: turn one of your family accounts into the organisation's, or add a new
 *   cottage that the organisation manages.
 * - Personal email (Gmail, Seznam…): an institution needs a work-email sign-in, so this starts
 *   the institution sign-up with the work email, and remembers the personal email so the new
 *   institution invites it as an admin afterwards.
 */
export function InstitutionSetup() {
  const { t } = useLang();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, memberships, accounts, account, properties } = useAccount();
  const email = user?.email ?? "";
  const workEmail = !!email && !isPublicEmailDomain(email);
  const [open, setOpen] = useState(false);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [orgName, setOrgName] = useState("");
  const [instEmail, setInstEmail] = useState("");
  const [busy, setBusy] = useState(false);

  // Family accounts this person runs: the ones that can become an organisation's.
  const adminFamily = memberships
    .filter((m) => m.role === "ADMIN" || m.role === "OWNER")
    .map((m) => accounts.find((a) => a.id === m.account_id))
    .filter((a): a is NonNullable<typeof a> => !!a && a.type === "FAMILY");
  const [target, setTarget] = useState<string | null>(null);
  const targetId = target ?? (adminFamily.length === 1 ? adminFamily[0]!.id : null);
  const cleanInstEmail = instEmail.trim().toLowerCase();
  const instEmailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(cleanInstEmail);
  const instEmailPublic = instEmailOk && isPublicEmailDomain(cleanInstEmail);

  const convert = async () => {
    if (!targetId) return;
    setBusy(true);
    const { error } = await supabase.rpc("convert_account_to_institution", {
      _account_id: targetId,
      _name: orgName.trim(),
    });
    setBusy(false);
    if (error) {
      console.error("[institution] convert", error);
      toast.error(
        error.message.includes("institution_email_required")
          ? t(
              "Organizaci může založit jen přihlášení pracovním e-mailem.",
              "Only a work-email sign-in can set up an organisation.",
            )
          : error.code === "42501"
            ? t("Převést účet může jen jeho správce.", "Only the account's admin can convert it.")
            : t(`Převod se nepodařil: ${error.message}`, `Could not convert: ${error.message}`),
      );
      return;
    }
    await queryClient.invalidateQueries();
    setOpen(false);
    toast.success(
      t(
        "Hotovo. Chaty tohoto účtu teď spravuje organizace.",
        "Done. The cottages in this account are now managed by the organisation.",
      ),
    );
  };

  const startInstitutionSignup = async () => {
    rememberPersonalEmail(email);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(t("Odhlášení se nepodařilo.", "Could not sign out."));
      return;
    }
    queryClient.clear();
    try {
      localStorage.removeItem("mychata.offline-cache");
    } catch {
      /* ignore */
    }
    navigate({
      to: "/auth",
      search: { mode: "institute", email: cleanInstEmail, org: orgName.trim() },
      replace: true,
    });
  };

  return (
    <section className="card mt-4 p-4">
      <h2 className="flex items-center gap-2 text-[16px] font-bold">
        <Building2 className="size-5 text-primary" />
        {t("Účet instituce", "Institutional account")}
      </h2>
      <p className="mt-1 text-[16px] text-muted-foreground">
        {t(
          "Pro školy, firmy, odbory a spolky, které spravují chatu pro své lidi.",
          "For schools, companies, unions and clubs that run a cottage for their people.",
        )}
      </p>
      {!open ? (
        <Button
          variant="fresh"
          size="fresh"
          className="btn-secondary mt-3 w-full"
          onClick={() => setOpen(true)}
        >
          {t("Přidat účet instituce", "Add an institutional account")}
        </Button>
      ) : workEmail ? (
        <div className="mt-3 space-y-3">
          <div className="grid gap-2">
            {adminFamily.length > 0 && (
              <Button
                variant="fresh"
                size="fresh"
                aria-pressed={choice === "convert"}
                className={`btn-secondary w-full ${choice === "convert" ? "ring-2 ring-primary" : ""}`}
                onClick={() => setChoice("convert")}
              >
                {t("Převést moji chatu na instituci", "Convert my cottage to the institution")}
              </Button>
            )}
            <Button
              variant="fresh"
              size="fresh"
              aria-pressed={choice === "new"}
              className={`btn-secondary w-full ${choice === "new" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setChoice("new")}
            >
              {t("Přidat novou chatu instituce", "Add a new cottage managed by the institution")}
            </Button>
          </div>
          {choice === "convert" && (
            <div className="space-y-3">
              {adminFamily.length > 1 && (
                <fieldset className="space-y-2">
                  <legend className="text-[16px] font-bold">
                    {t("Kterou chatu?", "Which cottage?")}
                  </legend>
                  {adminFamily.map((a) => (
                    <label
                      key={a.id}
                      className="flex min-h-11 items-center gap-3 rounded-2xl bg-secondary px-3"
                    >
                      <input
                        type="radio"
                        name="convert-target"
                        className="size-5"
                        checked={targetId === a.id}
                        onChange={() => setTarget(a.id)}
                      />
                      <span className="text-[16px] font-semibold">{a.name}</span>
                    </label>
                  ))}
                </fieldset>
              )}
              {targetId === account?.id && properties.length > 1 && (
                <p className="text-[16px] text-muted-foreground">
                  {t(
                    `Převedou se všechny chaty tohoto účtu: ${properties.map((p) => p.name).join(", ")}.`,
                    `Every cottage in this account moves over: ${properties.map((p) => p.name).join(", ")}.`,
                  )}
                </p>
              )}
              <input
                className="field w-full"
                placeholder={t("Název organizace", "Organisation name")}
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                autoComplete="organization"
              />
              <Button
                variant="fresh"
                size="fresh"
                className="btn-primary w-full"
                disabled={busy || !targetId || orgName.trim().length < 2}
                onClick={convert}
              >
                {busy ? t("Převádím…", "Converting…") : t("Převést", "Convert")}
              </Button>
            </div>
          )}
          {choice === "new" && (
            <Button
              variant="fresh"
              size="fresh"
              className="btn-primary w-full"
              onClick={() =>
                navigate({ to: "/onboarding", search: { kind: "institution", fresh: true } })
              }
            >
              {t("Pokračovat k nastavení", "Continue to set-up")}
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-[16px]">
            {t(
              `Jste přihlášeni osobním e-mailem (${email}). Instituce potřebuje pracovní e-mail, např. jana@vase-skola.cz.`,
              `You're signed in with a personal email (${email}). An institution needs a work email, e.g. jana@your-school.cz.`,
            )}
          </p>
          <input
            className="field w-full"
            type="email"
            placeholder={t("Pracovní e-mail instituce", "Institution work email")}
            value={instEmail}
            onChange={(e) => setInstEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={instEmailPublic}
          />
          {instEmailPublic && (
            <p className="rounded-2xl bg-warn-soft p-3 text-[16px] font-semibold text-warn-foreground">
              {t(
                "To je veřejná schránka. Zadejte e-mail na doméně vaší organizace.",
                "That's a public mailbox. Enter an email on your organisation's domain.",
              )}
            </p>
          )}
          <input
            className="field w-full"
            placeholder={t("Název organizace", "Organisation name")}
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            autoComplete="organization"
          />
          <p className="text-[16px] text-muted-foreground">
            {t(
              `Odhlásíme vás a otevřeme registraci instituce s tímto e-mailem. Po jejím dokončení instituce pozve ${email} jako správce, takže budete obě chaty přepínat v jednom přihlášení.`,
              `We'll sign you out and open the institution sign-up with this email. Once it's set up, the institution invites ${email} as an admin, so you can switch between both from one sign-in.`,
            )}
          </p>
          <Button
            variant="fresh"
            size="fresh"
            className="btn-primary w-full"
            disabled={!instEmailOk || instEmailPublic || orgName.trim().length < 2}
            onClick={startInstitutionSignup}
          >
            {t("Pokračovat k registraci instituce", "Continue to institution sign-up")}
          </Button>
        </div>
      )}
    </section>
  );
}
