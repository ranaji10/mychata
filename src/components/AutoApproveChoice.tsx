import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";

/**
 * "Auto booking approval: Yes / No" for organisations (T-042): onboarding and the prompt in
 * Members & permissions. An admin's own bookings are always confirmed, whatever the answer.
 */
export function AutoApproveChoice({
  value,
  onChange,
  disabled,
}: {
  value: boolean | null;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const { t } = useLang();
  return (
    <div className="space-y-2">
      <p className="text-[18px] font-bold">
        {t("Automaticky schvalovat rezervace?", "Auto booking approval?")}
      </p>
      <p className="text-[16px] text-muted-foreground">
        {t(
          "Ano: rezervace členů se potvrdí hned. Ne: každou schválí správce. Vaše vlastní rezervace se jako správci potvrdí vždy.",
          "Yes: members' bookings are confirmed straight away. No: an admin approves each one. Your own bookings as an admin are always confirmed.",
        )}
      </p>
      <div className="grid grid-cols-2 gap-2" role="radiogroup">
        <Button
          variant="fresh"
          size="fresh"
          role="radio"
          aria-checked={value === true}
          disabled={disabled}
          className={`btn-secondary ${value === true ? "ring-2 ring-primary" : ""}`}
          onClick={() => onChange(true)}
        >
          {t("Ano", "Yes")}
        </Button>
        <Button
          variant="fresh"
          size="fresh"
          role="radio"
          aria-checked={value === false}
          disabled={disabled}
          className={`btn-secondary ${value === false ? "ring-2 ring-primary" : ""}`}
          onClick={() => onChange(false)}
        >
          {t("Ne", "No")}
        </Button>
      </div>
    </div>
  );
}
