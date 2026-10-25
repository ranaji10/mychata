import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/PasswordInput";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { explainPasswordError, needsCurrentPassword } from "@/lib/password";

/**
 * New password twice, with show/hide. Used for "set a password" after a Google sign-up
 * (bug 4a), "change password" on My profile (bug 6) and the reset-password link (bug 4).
 */
export function SetPasswordForm({
  submitLabel,
  onDone,
  askCurrent = false,
}: {
  submitLabel?: string;
  onDone?: () => void;
  /**
   * Ask for the current password too. Supabase is set to require it when someone who already
   * has a password changes it while signed in (bug 15 of 18 Oct: "Current password required
   * when setting new password"). Not for the reset link, where the old one is forgotten.
   */
  askCurrent?: boolean;
}) {
  const { t } = useLang();
  const [current, setCurrent] = useState("");
  // Shown from the start when we know there is a password, or once the server asks for it.
  const [needCurrent, setNeedCurrent] = useState(askCurrent);
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = again.length > 0 && again !== password;

  const save = async () => {
    setBusy(true);
    setError("");
    // `current_password` is sent as is by supabase-js; older type definitions don't list it.
    const attributes = {
      password,
      data: { password_set: true },
      ...(needCurrent && current ? { current_password: current } : {}),
    } as Parameters<typeof supabase.auth.updateUser>[0];
    const { error: err } = await supabase.auth.updateUser(attributes);
    setBusy(false);
    if (err) {
      console.error("[password] update", err);
      if (needsCurrentPassword(err)) setNeedCurrent(true);
      setError(explainPasswordError(err.message, t));
      return;
    }
    setCurrent("");
    setPassword("");
    setAgain("");
    toast.success(t("Heslo uloženo.", "Password saved."));
    onDone?.();
  };

  const canSave =
    !busy && password.length >= 8 && password === again && (!needCurrent || !!current);

  return (
    // A form, so Enter in a password field saves (26 Oct request).
    <form
      className="space-y-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (canSave) void save();
      }}
    >
      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-destructive-soft p-3 font-semibold text-destructive"
        >
          {error}
        </p>
      )}
      {needCurrent && (
        <label className="block">
          <span className="text-[16px] font-bold">{t("Současné heslo", "Current password")}</span>
          <div className="mt-1">
            <PasswordInput
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        </label>
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
        type="submit"
        disabled={!canSave}
      >
        {busy ? t("Ukládám…", "Saving…") : (submitLabel ?? t("Uložit heslo", "Save password"))}
      </Button>
    </form>
  );
}
