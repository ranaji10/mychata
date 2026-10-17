import { Eye, EyeOff } from "lucide-react";
import { useState, type InputHTMLAttributes } from "react";
import { useLang } from "@/lib/i18n";

/**
 * A password field with a "show password" eye button (bug 4b, 17 Oct 2026). People type on
 * phones and couldn't check what they typed.
 */
export function PasswordInput({
  className = "",
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const { t } = useLang();
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input
        {...props}
        type={shown ? "text" : "password"}
        className={`field w-full pr-14 ${className}`}
      />
      <button
        type="button"
        onClick={() => setShown((v) => !v)}
        aria-label={
          shown ? t("Skrýt heslo", "Hide password") : t("Zobrazit heslo", "Show password")
        }
        aria-pressed={shown}
        className="absolute right-1 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
      >
        {shown ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </button>
    </div>
  );
}
