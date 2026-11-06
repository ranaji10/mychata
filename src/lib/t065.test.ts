// T-065 (O-31): zod 4. Every server-function input is checked with what the forms send and
// with what they must refuse, so the major version can't change behaviour unnoticed.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  askManualInput,
  documentInput,
  guestLinkInput,
  guestRequestInput,
  propertyInput,
  translateInput,
} from "@/lib/input-schemas";

const token = "a".repeat(32);
const id = "3f2a9c1e-5b7d-4e8a-9c21-7d4e5f6a8b90";
// Hand-written seed ids have no RFC version bits; zod 3's uuid() took them and so must we.
const seedId = "00000000-0000-0000-0000-000000000001";
const request = {
  token,
  name: "Jana Nováková",
  email: "jana@example.org",
  startDate: "2026-12-01",
  endDate: "2026-12-03",
  guests: 2,
};

describe("zod 4 is installed", () => {
  it("package.json asks for zod 4 (GHSA-mrhx-c7xc-m3w5 is fixed there)", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(pkg.dependencies.zod).toMatch(/^\^4\./);
  });
});

describe("guest link and guest request (organisation's shared form)", () => {
  it("takes a link token of 16–64 characters", () => {
    expect(guestLinkInput.parse({ token })).toEqual({ token });
    expect(() => guestLinkInput.parse({ token: "short" })).toThrow();
    expect(() => guestLinkInput.parse({ token: "x".repeat(65) })).toThrow();
  });

  it("takes what the form sends, with and without a note", () => {
    expect(guestRequestInput.parse(request)).toEqual(request);
    expect(guestRequestInput.parse({ ...request, note: "Přijedeme večer", company: "" })).toEqual({
      ...request,
      note: "Přijedeme večer",
      company: "",
    });
    // Czech letters in the address part pass as before (IDN mailboxes are rare; not tested).
    expect(guestRequestInput.parse({ ...request, email: "petr.novak+chata@seznam.cz" }).email).toBe(
      "petr.novak+chata@seznam.cz",
    );
  });

  it.each([
    ["a bad e-mail", { email: "jana@" }],
    ["an e-mail over 200 characters", { email: `${"a".repeat(195)}@x.org` }],
    ["a one-letter name", { name: "J" }],
    ["a date in another format", { startDate: "1.12.2026" }],
    ["0 guests", { guests: 0 }],
    ["51 guests", { guests: 51 }],
    ["1.5 guests", { guests: 1.5 }],
    ["guests as text", { guests: "2" }],
    ["a note over 1000 characters", { note: "x".repeat(1001) }],
    ["a filled honeypot", { company: "ACME" }],
  ])("refuses %s", (_label, change) => {
    expect(() => guestRequestInput.parse({ ...request, ...change })).toThrow();
  });
});

describe("house manual and documents", () => {
  it("takes a cottage or document id, also a seed id without version bits", () => {
    expect(propertyInput.parse({ propertyId: id })).toEqual({ propertyId: id });
    expect(propertyInput.parse({ propertyId: seedId })).toEqual({ propertyId: seedId });
    expect(documentInput.parse({ documentId: id })).toEqual({ documentId: id });
    expect(() => propertyInput.parse({ propertyId: "not-an-id" })).toThrow();
    expect(() => documentInput.parse({ documentId: `${id}x` })).toThrow();
  });

  it("takes a question with up to three earlier turns", () => {
    const turn = { question: "Kde je klíč?", answer: "Pod rohožkou." };
    const ok = {
      propertyId: id,
      question: "A elektřina?",
      lang: "cs",
      earlier: [turn, turn, turn],
    };
    expect(askManualInput.parse(ok)).toEqual(ok);
    expect(askManualInput.parse({ propertyId: id, question: "Wi-Fi?", lang: "en" })).toBeTruthy();
  });

  it.each([
    ["a one-letter question", { question: "?" }],
    ["a question over 500 characters", { question: "x".repeat(501) }],
    ["another language", { lang: "de" }],
    ["four earlier turns", { earlier: Array(4).fill({ question: "q", answer: "a" }) }],
    [
      "an earlier answer over 2000 characters",
      { earlier: [{ question: "q", answer: "x".repeat(2001) }] },
    ],
  ])("refuses %s", (_label, change) => {
    expect(() =>
      askManualInput.parse({ propertyId: id, question: "Kde je klíč?", lang: "cs", ...change }),
    ).toThrow();
  });
});

describe("task translation", () => {
  it("trims the text and takes Czech or English", () => {
    expect(translateInput.parse({ text: "  Posekat trávu ", sourceLanguage: "cs" })).toEqual({
      text: "Posekat trávu",
      sourceLanguage: "cs",
    });
  });
  it("refuses empty text, text over 500 characters and another language", () => {
    expect(() => translateInput.parse({ text: "   ", sourceLanguage: "cs" })).toThrow();
    expect(() => translateInput.parse({ text: "x".repeat(501), sourceLanguage: "en" })).toThrow();
    expect(() => translateInput.parse({ text: "Hallo", sourceLanguage: "de" })).toThrow();
  });
});

describe("oversized input (the advisory's case) is refused quickly", () => {
  it("a 1 MB note fails the 1000-character limit in well under a second", () => {
    const started = performance.now();
    expect(guestRequestInput.safeParse({ ...request, note: "x".repeat(1_000_000) }).success).toBe(
      false,
    );
    expect(performance.now() - started).toBeLessThan(1000);
  });
});

describe("server functions use the shared schemas", () => {
  it.each([
    ["src/lib/guest.functions.ts", ["guestLinkInput", "guestRequestInput"]],
    ["src/lib/manual-qa.functions.ts", ["propertyInput", "documentInput", "askManualInput"]],
    ["src/lib/task-translation.functions.ts", ["translateInput"]],
  ])("%s", (file, names) => {
    const src = readFileSync(file, "utf8");
    for (const n of names) expect(src).toContain(`${n}.parse(`);
    expect(src).not.toMatch(/from "zod"/);
  });
});
