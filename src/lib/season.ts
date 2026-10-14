import { useLang } from "@/lib/i18n";
import spring from "@/assets/seasons/chata-spring.webp";
import summer from "@/assets/seasons/chata-summer.webp";
import autumn from "@/assets/seasons/chata-autumn.webp";
import winter from "@/assets/seasons/chata-winter.webp";

export function seasonFor(date = new Date()): "spring" | "summer" | "autumn" | "winter" {
  const month = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Prague", month: "numeric" }).format(date),
  );
  return month >= 3 && month <= 5
    ? "spring"
    : month >= 6 && month <= 8
      ? "summer"
      : month >= 9 && month <= 11
        ? "autumn"
        : "winter";
}
export function useDefaultChataPhoto() {
  const { t } = useLang();
  const season = seasonFor();
  const photos = { spring, summer, autumn, winter };
  const alt = {
    spring: t("Chata na jaře", "The chata in spring"),
    summer: t("Chata v létě", "The chata in summer"),
    autumn: t("Chata na podzim", "The chata in autumn"),
    winter: t("Chata v zimě", "The chata in winter"),
  };
  return { src: photos[season], alt: alt[season] };
}
