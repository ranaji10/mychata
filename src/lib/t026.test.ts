import { describe, expect, it } from "vitest";
import { csvCell, csvRow } from "./csv";
import { guestCount } from "./data";

describe("usage export CSV (T-026)", () => {
  it("keeps plain values as they are", () => {
    expect(csvRow(["Jana Nováková", "jana@example.cz", 3])).toBe("Jana Nováková;jana@example.cz;3");
    expect(csvCell(null)).toBe("");
  });

  it("quotes values with the separator, quotes or line breaks", () => {
    expect(csvCell("Novák; Jan")).toBe('"Novák; Jan"');
    expect(csvCell('Ústav "A"')).toBe('"Ústav ""A"""');
    expect(csvCell("řádek 1\nřádek 2")).toBe('"řádek 1\nřádek 2"');
  });

  it("stops text from the public form from running as a spreadsheet formula", () => {
    expect(csvCell('=HYPERLINK("http://x")')).toBe('"\'=HYPERLINK(""http://x"")"');
    expect(csvCell("+420 777 123 456")).toBe("'+420 777 123 456");
    expect(csvCell("-1")).toBe("'-1");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
  });
});

describe("guest counts (T-026)", () => {
  it("uses the right plural in both languages", () => {
    expect(guestCount(1, "en")).toBe("1 guest");
    expect(guestCount(3, "en")).toBe("3 guests");
    expect(guestCount(1, "cs")).toBe("1 host");
    expect(guestCount(3, "cs")).toBe("3 hosté");
    expect(guestCount(5, "cs")).toBe("5 hostů");
  });
});
