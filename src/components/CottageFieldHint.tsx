import { FIELD_HINTS } from "@/lib/cottage-content";
import { useLang } from "@/lib/i18n";

export function CottageFieldHint({ field }: { field: keyof typeof FIELD_HINTS }) {
  const { t } = useLang();
  const pair = FIELD_HINTS[field];
  return <p className="mt-1 text-[16px] text-muted-foreground">{t("Proč se ptáme", "Why we ask")}: {t(pair[0], pair[1])}</p>;
}