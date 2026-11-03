// T-056: error codes from database functions become plain words.
import { describe, expect, it } from "vitest";
import { friendlyError, rpcErrorCode } from "@/lib/rpc-errors";

const cs = (c: string) => c;
const en = (_c: string, e: string) => e;

describe("T-056 friendly RPC errors", () => {
  it("maps known codes in both languages", () => {
    expect(friendlyError("rate_limited", cs)).toContain("Dnes už");
    expect(friendlyError("nothing_owed", en)).toBe("This person doesn't owe you anything.");
    expect(rpcErrorCode("new row violates: no_admin")).toBe("no_admin");
  });
  it("keeps unknown messages as they are", () => {
    expect(friendlyError("Failed to fetch", cs)).toBe("Failed to fetch");
  });
});
