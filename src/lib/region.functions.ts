import { createServerFn } from "@tanstack/react-start";
import { CONSENT_REGIONS } from "./consent-regions";

/** Whether the visitor needs a consent banner. Unknown country → true (safe default). */
export const getConsentRequired = createServerFn({ method: "GET" }).handler(async () => {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  const country = (getRequestHeader("cf-ipcountry") ?? "").toUpperCase();
  return { country, required: !country || country === "XX" || CONSENT_REGIONS.includes(country) };
});
