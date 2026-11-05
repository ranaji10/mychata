import { describe, expect, it } from "vitest";
import { inviteMailto, parseEmails, splitExistingMembers } from "./invites";
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
  it("builds a Czech mail link with the invitation link by default", () => {
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
    expect(body).not.toContain("invites you");
    expect(body.match(/https:\/\/mychata\.cz\/pozvanka\/abc/g)).toHaveLength(1);
  });
  it("writes only English when the sender uses the app in English (T-059)", () => {
    const url = inviteMailto({
      to: "jana@example.cz",
      link: "https://mychata.cz/pozvanka/abc",
      chata: "Chata Pod Lesem",
      inviter: "Tuik",
      admin: false,
      lang: "en",
    });
    const subject = decodeURIComponent(url.split("subject=")[1]!.split("&")[0]!);
    const body = decodeURIComponent(url.split("&body=")[1]!);
    expect(subject).toBe("Invitation to Chata Pod Lesem");
    expect(body).toContain("Tuik invites you to Chata Pod Lesem on MyChata.");
    expect(body).not.toMatch(/zve|Pozvánk/);
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

describe("inviteMailto for a batch (PR #46 review)", () => {
  it("puts several people in Bcc so no one sees the others' addresses", () => {
    const url = inviteMailto({
      to: ["a@example.cz", "b@example.cz"],
      link: "https://mychata.cz/pozvanka/g",
      chata: "Chata",
      admin: false,
    });
    expect(url.startsWith("mailto:?bcc=a%40example.cz,b%40example.cz&subject=")).toBe(true);
  });
});

describe("splitExistingMembers (T-059)", () => {
  it("leaves out addresses that already belong to a member, in any letter case", () => {
    const r = splitExistingMembers(
      ["me@example.cz", "new@example.cz"],
      [{ email: "Me@Example.cz" }, { email: null }],
    );
    expect(r).toEqual({ fresh: ["new@example.cz"], existing: ["me@example.cz"] });
  });
});
