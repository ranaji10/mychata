import { describe, expect, it } from "vitest";
import { equalShares, isoDateOrNull, parseAmount, pickRange, settlementSuggestions } from "./data";
import {
  bestExcerpt,
  docxXmlToText,
  fileKind,
  parseModelAnswer,
  preferredChatModels,
  type AnswerSource,
} from "./manual-answers";
import { authLinkError, isPublicEmailDomain, signupMetadata } from "./signup";

describe("picking dates on the calendar", () => {
  it("first tap is arrival, second departure, earlier tap restarts", () => {
    let r = pickRange({ start: null, end: null }, "2026-10-05");
    expect(r).toEqual({ start: "2026-10-05", end: null });
    r = pickRange(r, "2026-10-03");
    expect(r).toEqual({ start: "2026-10-03", end: null });
    r = pickRange(r, "2026-10-08");
    expect(r).toEqual({ start: "2026-10-03", end: "2026-10-08" });
    expect(pickRange(r, "2026-10-10")).toEqual({ start: "2026-10-10", end: null });
  });
  it("only real dates pass through the address", () => {
    expect(isoDateOrNull("2026-10-05")).toBe("2026-10-05");
    expect(isoDateOrNull("2026-02-30")).toBeNull();
    expect(isoDateOrNull("x")).toBeNull();
  });
});

describe("expenses", () => {
  it("equal shares add up exactly", () => {
    expect(equalShares(100, 3)).toEqual([33.34, 33.33, 33.33]);
  });
  it("reads Czech amounts", () => {
    expect(parseAmount("1 250,50")).toBe(1250.5);
    expect(parseAmount("abc")).toBeNaN();
  });
  it("nets debts between two people", () => {
    const s = settlementSuggestions(
      [
        { id: "e1", paid_by_member_id: "anna" },
        { id: "e2", paid_by_member_id: "petr" },
      ],
      [
        { expense_id: "e1", member_id: "petr", amount_owed: 300, paid_back: false },
        { expense_id: "e2", member_id: "anna", amount_owed: 100, paid_back: false },
      ],
    );
    expect(s).toEqual([{ from: "petr", to: "anna", amount: 200 }]);
  });
});

describe("answers from the manual and documents", () => {
  const src = (title: string, text: string): AnswerSource => ({
    key: title,
    kind: "manual",
    id: title,
    title,
    text,
  });
  it("quotes the best matching passage without AI", () => {
    const best = bestExcerpt(
      [
        src("Wi-Fi", "Heslo je chata123"),
        src("Topení", "Kotel zapnete vypínačem.\nKočky nesmí do ložnice."),
      ],
      "Mohou sem kočky?",
    );
    expect(best?.source.title).toBe("Topení");
    expect(best?.excerpt).toContain("Kočky");
  });
  it("reads the model's JSON or plain text", () => {
    expect(parseModelAnswer('```json\n{"answer":"Ano","sources":[2,9]}\n```', 3)).toEqual({
      answer: "Ano",
      used: [2],
    });
    expect(parseModelAnswer("Yes [1]", 2)).toEqual({ answer: "Yes [1]", used: [1] });
  });
  it("turns Word XML into text", () => {
    expect(docxXmlToText("<w:p><w:r><w:t>A &amp; B</w:t></w:r></w:p><w:p>C</w:p>")).toBe(
      "A & B\nC",
    );
  });
  it("prefers the newest Gemini Flash model the gateway lists", () => {
    expect(
      preferredChatModels(
        ["google/gemini-3.6-flash", "google/gemini-3.8-flash", "google/gemini-3.1-flash-lite"],
        ["x"],
      ),
    ).toEqual(["google/gemini-3.8-flash", "google/gemini-3.6-flash", "x"]);
    expect(fileKind("manual.PDF")).toBe("pdf");
    expect(fileKind("a.docx")).toBe("docx");
  });
});

describe("sign-up", () => {
  it("knows public mailboxes, link errors and the sign-up name", () => {
    expect(isPublicEmailDomain("x@Gmail.com")).toBe(true);
    expect(isPublicEmailDomain("x@vse.cz")).toBe(false);
    expect(authLinkError("#error=access_denied&error_code=otp_expired")).toBe("expired");
    expect(authLinkError("")).toBeNull();
    expect(signupMetadata({ full_name: " Jana ", signup_kind: "institution" })).toMatchObject({
      fullName: "Jana",
      kind: "institution",
    });
  });
});
