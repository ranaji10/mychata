import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import spring from "@/assets/seasons/chata-spring.webp.asset.json";
import summer from "@/assets/seasons/chata-summer.webp.asset.json";
import autumn from "@/assets/seasons/chata-autumn.webp.asset.json";
import winter from "@/assets/seasons/chata-winter.webp.asset.json";

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
  const [season, setSeason] = useState(seasonFor);
  useEffect(() => {
    const timer = window.setInterval(() => setSeason(seasonFor()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const photos = { spring, summer, autumn, winter };
  const alt = {
    spring: t("Chata na jaře", "The chata in spring"),
    summer: t("Chata v létě", "The chata in summer"),
    autumn: t("Chata na podzim", "The chata in autumn"),
    winter: t("Chata v zimě", "The chata in winter"),
  };
  return { src: photos[season].url, alt: alt[season] };
}
