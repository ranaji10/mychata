// T-041: what T-040 left open of the bugs of 18 Oct 2026.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cottageCount } from "@/lib/account-label";
import { earlierMessages, MAX_EARLIER_TURNS, retrievalQuery } from "@/lib/manual-answers";

const cs = (cs: string) => cs;
const en = (_cs: string, en: string) => en;

describe("organisations book from the calendar (bug 17)", () => {
  it("shows Continue to booking for every account type", () => {
    const page = readFileSync("src/routes/kalendar.tsx", "utf8");
    expect(page).not.toMatch(/isFamily && range\.start/);
    expect(page).not.toMatch(/isFamily && <OverlapNotice/);
    expect(page).toMatch(/\{range\.start && \(/);
  });
});

describe("no 'free' that reads like a price (bug 2)", () => {
  it("public calendar says available", () => {
    const page = readFileSync("src/routes/verejne.kalendar.$token.tsx", "utf8");
    expect(page).not.toMatch(/still free/);
  });
});

describe("switcher headings (bug 16)", () => {
  it("counts cottages in Czech and English", () => {
    expect(cottageCount(1, cs)).toBe("1 chata");
    expect(cottageCount(3, cs)).toBe("3 chaty");
    expect(cottageCount(5, cs)).toBe("5 chat");
    expect(cottageCount(1, en)).toBe("1 cottage");
    expect(cottageCount(3, en)).toBe("3 cottages");
  });
});

describe("follow-up questions (bug 12)", () => {
  it("ranks sources by the new and the previous question", () => {
    expect(retrievalQuery("a v zimě?")).toBe("a v zimě?");
    expect(
      retrievalQuery("a v zimě?", [
        { question: "kde je hlavní uzávěr vody", answer: "Ve sklepě." },
      ]),
    ).toBe("a v zimě? kde je hlavní uzávěr vody");
  });

  it("sends at most the last turns, oldest first", () => {
    const turns = Array.from({ length: 5 }, (_, i) => ({ question: `q${i}`, answer: `a${i}` }));
    const messages = earlierMessages(turns);
    expect(messages).toHaveLength(MAX_EARLIER_TURNS * 2);
    expect(messages[0]).toEqual({ role: "user", content: "q2" });
    expect(JSON.parse(messages[1]!.content)).toEqual({ answer: "a2", sources: [] });
    expect(messages.at(-2)).toEqual({ role: "user", content: "q4" });
    expect(earlierMessages()).toEqual([]);
  });
});
