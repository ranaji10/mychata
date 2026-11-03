// T-057: e-mail language from links, house rules in both languages, cottage facts, one-language
// e-mails, brand spelled "MyChata".
import { describe, expect, it } from "vitest";
import { render } from "@react-email/render";
import * as React from "react";
import { langFromLinks } from "@/lib/auth-email-lang";
import { bilingualRules, STARTER_RULES } from "@/lib/cottage-content";
import { cottageFactsLine, missingCottageDetails } from "@/lib/cottage-details";
import { SignupEmail } from "@/lib/email-templates/signup";
import { RecoveryEmail } from "@/lib/email-templates/recovery";
import type { Property } from "@/lib/data";

const en = (_cs: string, e: string) => e;

describe("sign-in e-mail language", () => {
  it("reads ?lang from the link or the address it returns to", () => {
    expect(
      langFromLinks(
        "https://x.supabase.co/auth/v1/verify?token=1&redirect_to=https%3A%2F%2Fmychata.cz%2Fauth%3Flang%3Den",
      ),
    ).toBe("en");
    expect(langFromLinks(null, "https://mychata.cz/auth?lang=cs")).toBe("cs");
    expect(langFromLinks("https://mychata.cz/auth", "not a url")).toBeNull();
    expect(langFromLinks("https://mychata.cz/auth?lang=de")).toBeNull();
  });
  it("the sign-up and reset e-mails are in one language", async () => {
    const english = await render(
      React.createElement(SignupEmail, { confirmationUrl: "https://example.test/c", lang: "en" }),
    );
    expect(english).toMatch(/<html[^>]*lang="en"/);
    expect(english).toContain("Confirm your email");
    expect(english).not.toContain("Potvrďte");
    const czech = await render(
      React.createElement(RecoveryEmail, { confirmationUrl: "https://example.test/c" }),
    );
    expect(czech).toContain("Nastavte si nové heslo");
    expect(czech).not.toContain("Set a new password");
  });
});

describe("house rules", () => {
  it("starter rules get their translation; own lines stay; blank lines go", () => {
    const [cs, enRule] = STARTER_RULES[0]!;
    const r = bilingualRules(`${enRule}\n \n  Klid po 22:00  \n`);
    expect(r).toEqual({ cs: `${cs}\nKlid po 22:00`, en: `${enRule}\nKlid po 22:00` });
    expect(bilingualRules(" \n ")).toEqual({ cs: "", en: "" });
  });
});

describe("cottage facts", () => {
  it("Czech plurals: 1 pokoj, 3 pokoje, 6 pokojů", () => {
    const cs = (c: string) => c;
    const base = { rooms: 1, capacity: 3, beds: 6 } as unknown as Property;
    expect(cottageFactsLine(base, cs)).toBe("3 osoby · 1 pokoj · 6 lůžek");
    expect(cottageFactsLine({ ...base, rooms: 6, capacity: 5, beds: 2 }, cs)).toBe(
      "5 osob · 6 pokojů · 2 lůžka",
    );
  });
  const p = {
    address: "Lesní 1",
    city: "Testov",
    rooms: 3,
    peak_seasons: ["summer"],
    overlap_max_guests: null,
  } as unknown as Property;
  it("capacity counts as missing only once the column exists", () => {
    expect(missingCottageDetails({ ...p, capacity: null }, true)).toEqual(["capacity"]);
    expect(missingCottageDetails(p, true)).toEqual([]);
    expect(missingCottageDetails({ ...p, capacity: 6 }, true)).toEqual([]);
  });
  it("one line of facts for the cottage card", () => {
    expect(
      cottageFactsLine(
        {
          ...p,
          capacity: 6,
          beds: 5,
          check_in_time: "15:00",
          check_out_time: "10:00",
          pets_allowed: false,
        },
        en,
      ),
    ).toBe("6 people · 3 rooms · 5 beds · arrival from 15:00 · leave by 10:00 · no pets");
  });
});
