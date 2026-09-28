import { describe, expect, it } from "vitest";
import { classifyUploadError, fitWithin, isHeic, PhotoError, uploadErrorMessage } from "./photos";

const t = (cs: string) => cs;

describe("photo upload errors (B-007)", () => {
  it("a file over the bucket limit is 'too large'", () => {
    expect(
      classifyUploadError({
        name: "StorageApiError",
        statusCode: "413",
        message: "The object exceeded the maximum allowed size",
      }),
    ).toBe("too_large");
  });
  it("a refused MIME type (HEIC) is 'wrong type'", () => {
    expect(
      classifyUploadError({ statusCode: "415", message: "mime type image/heic is not supported" }),
    ).toBe("wrong_type");
    expect(classifyUploadError(new PhotoError("wrong_type", "cannot decode image/heic"))).toBe(
      "wrong_type",
    );
  });
  it("a storage policy refusal or table policy refusal is 'no permission'", () => {
    expect(
      classifyUploadError({
        statusCode: "403",
        message: "new row violates row-level security policy",
      }),
    ).toBe("permission");
    expect(classifyUploadError({ code: "42501", message: "permission denied" })).toBe("permission");
  });
  it("fetch failures and being offline are 'network'", () => {
    expect(classifyUploadError(new TypeError("Failed to fetch"))).toBe("network");
    expect(classifyUploadError(new TypeError("Load failed"))).toBe("network"); // Safari
    expect(
      classifyUploadError({
        name: "StorageUnknownError",
        originalError: { message: "NetworkError when attempting to fetch resource." },
      }),
    ).toBe("network");
    expect(classifyUploadError({ message: "anything" }, false)).toBe("network");
  });
  it("anything else keeps the real message", () => {
    expect(classifyUploadError(new Error("boom"))).toBe("unknown");
    expect(uploadErrorMessage("unknown", t, "boom")).toContain("boom");
    expect(uploadErrorMessage("wrong_type", t)).toContain("HEIC");
  });
});

describe("photo resizing (B-007)", () => {
  it("fits the long side into 2000 px and never enlarges", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1500, height: 2000 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });
  it("recognises HEIC by type or by name", () => {
    expect(isHeic({ name: "IMG_0001.HEIC", type: "" })).toBe(true);
    expect(isHeic({ name: "x", type: "image/heif" })).toBe(true);
    expect(isHeic({ name: "a.jpg", type: "image/jpeg" })).toBe(false);
  });
});
