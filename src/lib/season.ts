import { useLang } from "@/lib/i18n";
import spring from "@/assets/seasons/chata-spring.webp";
import summer from "@/assets/seasons/chata-summer.webp";
import autumn from "@/assets/seasons/chata-autumn.webp";
import winter from "@/assets/seasons/chata-winter.webp";
import spring800 from "@/assets/seasons/chata-spring-800.webp";
import summer800 from "@/assets/seasons/chata-summer-800.webp";
import autumn800 from "@/assets/seasons/chata-autumn-800.webp";
import winter800 from "@/assets/seasons/chata-winter-800.webp";

// Phones (most of our users) get the 800px copy, about half the bytes; wider screens get 1200px.
const SIZES = "(max-width: 640px) 100vw, 640px";

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
  const small = { spring: spring800, summer: summer800, autumn: autumn800, winter: winter800 };
  const alt = {
    spring: t("Chata na jaře", "The chata in spring"),
    summer: t("Chata v létě", "The chata in summer"),
    autumn: t("Chata na podzim", "The chata in autumn"),
    winter: t("Chata v zimě", "The chata in winter"),
  };
  return {
    src: photos[season],
    srcSet: `${small[season]} 800w, ${photos[season]} 1200w`,
    sizes: SIZES,
    alt: alt[season],
  };
}
