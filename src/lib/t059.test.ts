import { describe, expect, it } from "vitest";
import { countHint, countOk } from "./cottage-details";
import { friendlyError } from "./rpc-errors";

const t = (_cs: string, en: string) => en;

describe("countOk (T-059)", () => {
  it("accepts an empty field and whole numbers in range", () => {
    for (const v of ["", " ", "1", "6", " 200 "]) expect(countOk(v, 200)).toBe(true);
  });
  it("refuses negatives, zero, decimals and numbers over the limit", () => {
    for (const v of ["-3", "0", "2.5", "201", "1e3"]) expect(countOk(v, 200)).toBe(false);
  });
  it("says what to type", () => {
    expect(countHint(500, t)).toBe("Enter a whole number from 1 to 500.");
  });
});

describe("plain messages for bad cottage numbers (T-059)", () => {
  it("maps the column checks and the integer cast", () => {
    expect(
      friendlyError(
        'new row for relation "properties" violates check constraint "properties_rooms_check"',
        t,
      ),
    ).toBe("Rooms must be from 1 to 200.");
    expect(friendlyError('invalid input syntax for type integer: "2.5"', t)).toBe(
      "Enter a whole number, without decimals.",
    );
  });
});
