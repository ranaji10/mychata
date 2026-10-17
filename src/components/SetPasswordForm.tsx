import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/PasswordInput";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { explainPasswordError } from "@/lib/password";

/**
 * New password twice, with show/hide. Used for "set a password" after a Google sign-up
 * (bug 4a), "change password" on My profile (bug 6) and the reset-password link (bug 4).
 */
export function SetPasswordForm({
  submitLabel,
  onDone,
}: {
  submitLabel?: string;
  onDone?: () => void;
}) {
  const { t } = useLang();
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = again.length > 0 && again !== password;

  const save = async () => {
    setBusy(true);
    setError("");
    const { error: err } = await supabase.auth.updateUser({
      password,
      data: { password_set: true },
    });
    setBusy(false);
    if (err) {
      console.error("[password] update", err);
      setError(explainPasswordError(err.message, t));
      return;
    }
    setPassword("");
    setAgain("");
    toast.success(t("Heslo uloženo.", "Password saved."));
    onDone?.();
  };

  return (
    <div className="space-y-3">
      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-destructive-soft p-3 font-semibold text-destructive"
        >
          {error}
        </p>
      )}
      <label className="block">
        <span className="text-[16px] font-bold">{t("Nové heslo", "New password")}</span>
        <div className="mt-1">
          <PasswordInput
            placeholder={t("Alespoň 8 znaků", "At least 8 characters")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            aria-invalid={tooShort}
          />
        </div>
      </label>
      <label className="block">
        <span className="text-[16px] font-bold">{t("Heslo znovu", "Password again")}</span>
        <div className="mt-1">
          <PasswordInput
            value={again}
            onChange={(e) => setAgain(e.target.value)}
            autoComplete="new-password"
            aria-invalid={mismatch}
          />
        </div>
      </label>
      {(tooShort || mismatch) && (
        <p className="text-[16px] font-semibold text-warn-foreground">
          {tooShort
            ? t("Heslo musí mít alespoň 8 znaků.", "The password needs at least 8 characters.")
            : t("Hesla se neshodují.", "The passwords don't match.")}
        </p>
      )}
      <Button
        variant="fresh"
        size="fresh"
        className="btn-primary w-full"
        disabled={busy || password.length < 8 || password !== again}
        onClick={save}
      >
        {busy ? t("Ukládám…", "Saving…") : (submitLabel ?? t("Uložit heslo", "Save password"))}
      </Button>
    </div>
  );
}
