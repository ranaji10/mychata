import { describe, expect, it } from "vitest";
import { seasonFor } from "./season";

describe("Prague meteorological seasons", () => {
  it.each([
    ["2027-02-28T12:00:00Z", "winter"],
    ["2027-03-01T12:00:00Z", "spring"],
    ["2027-05-31T12:00:00Z", "spring"],
    ["2027-06-01T12:00:00Z", "summer"],
    ["2027-08-31T12:00:00Z", "summer"],
    ["2027-09-01T12:00:00Z", "autumn"],
    ["2027-11-30T12:00:00Z", "autumn"],
    ["2027-12-01T12:00:00Z", "winter"],
    ["2027-02-28T23:30:00Z", "spring"],
  ])("%s is %s", (date: string, season: string) => expect(seasonFor(new Date(date))).toBe(season));
});
