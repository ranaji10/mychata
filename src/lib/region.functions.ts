import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

// EU/EEA + UK + Switzerland: consent banner required.
export const CONSENT_REGIONS = [
  "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
  "IS","LI","NO","GB","CH",
];

/** Returns whether the visitor needs a consent banner. Unknown country → true (safe default). */
export const getConsentRequired = createServerFn({ method: "GET" }).handler(async () => {
  const country = (getRequestHeader("cf-ipcountry") ?? "").toUpperCase();
  return { country, required: !country || country === "XX" || CONSENT_REGIONS.includes(country) };
});
