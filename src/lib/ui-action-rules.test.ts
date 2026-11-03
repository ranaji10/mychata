import { describe, expect, it } from "vitest";
import { canCoverExpense, canEditTaskNote, validTaskNote } from "./ui-action-rules";

describe("requested UI action rules", () => {
  it("offers Cover it all to the payer only, not another admin", () => {
    expect(canCoverExpense("payer", "payer")).toBe(true);
    expect(canCoverExpense("payer", "other-admin")).toBe(false);
    expect(canCoverExpense(null, undefined)).toBe(false);
  });
  it("offers note editing and deletion only to the author", () => {
    expect(canEditTaskNote("author", "author")).toBe(true);
    expect(canEditTaskNote("author", "other-member")).toBe(false);
  });
  it("accepts notes of 1 to 2000 characters", () => {
    expect(validTaskNote("a", 0)).toBe(true);
    expect(validTaskNote("a".repeat(2000), 0)).toBe(true);
    expect(validTaskNote("a".repeat(2001), 0)).toBe(false);
    expect(validTaskNote(" ", 0)).toBe(false);
  });
  it("accepts no more than 20 mentions", () => {
    expect(validTaskNote("note", 20)).toBe(true);
    expect(validTaskNote("note", 21)).toBe(false);
  });
});