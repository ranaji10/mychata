import { describe, expect, it } from "vitest";
import { inviteMailto, parseEmails } from "./invites";
import { inviteErrorKind } from "./pending-invite";

describe("parseEmails", () => {
  it("accepts a pasted list in any common format, once each, lower case", () => {
    const { valid, invalid } = parseEmails(
      "Jana <Jana@Example.cz>, petr@example.cz; petr@example.cz\nuni.person@vse.cz",
    );
    expect(valid).toEqual(["jana@example.cz", "petr@example.cz", "uni.person@vse.cz"]);
    expect(invalid).toEqual([]);
  });
  it("reports addresses that can't be right", () => {
    expect(parseEmails("ok@example.cz bad@nodot x@y.c").invalid).toEqual(["bad@nodot", "x@y.c"]);
  });
  it("ignores words without @", () => {
    expect(parseEmails("please invite anna@example.cz").valid).toEqual(["anna@example.cz"]);
  });
});

describe("inviteMailto", () => {
  it("builds a mail link with both languages and the invitation link", () => {
    const url = inviteMailto({
      to: "jana@example.cz",
      link: "https://mychata.cz/pozvanka/abc",
      chata: "Chata Pod Lesem",
      inviter: "Tuik",
      admin: true,
    });
    expect(url.startsWith("mailto:jana%40example.cz?subject=")).toBe(true);
    const body = decodeURIComponent(url.split("&body=")[1]!);
    expect(body).toContain("Tuik vás zve jako správce do chaty Chata Pod Lesem");
    expect(body).toContain("Tuik invites you as an admin to Chata Pod Lesem");
    expect(body.match(/https:\/\/mychata\.cz\/pozvanka\/abc/g)).toHaveLength(2);
  });
});

describe("inviteErrorKind", () => {
  it("maps the database errors from migration 0020", () => {
    expect(inviteErrorKind("invitation_email_mismatch")).toBe("email_mismatch");
    expect(inviteErrorKind("ERROR: invitation_expired")).toBe("expired");
    expect(inviteErrorKind("invitation_used")).toBe("used");
    expect(inviteErrorKind("invitation_not_found")).toBe("not_found");
    expect(inviteErrorKind("network down")).toBe("unknown");
  });
});
