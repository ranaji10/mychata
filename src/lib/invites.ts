// Inviting several people at once, and sending the link from the admin's own mail app until
// the app sends email itself (T-005).

const EMAIL = /^[^\s@,;<>()"]+@[^\s@,;<>()"]+\.[^\s@,;<>()"]{2,}$/;

/** Splits pasted text (commas, semicolons, spaces, new lines, "Name <a@b.cz>") into emails. */
export function parseEmails(text: string): { valid: string[]; invalid: string[] } {
  const parts = text
    .split(/[\s,;]+/)
    .map((p) => p.replace(/^<|>$/g, "").trim().toLowerCase())
    .filter((p) => p.includes("@"));
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const p of parts) {
    if (!EMAIL.test(p)) invalid.push(p);
    else if (!valid.includes(p)) valid.push(p);
  }
  return { valid, invalid };
}

export function inviteLink(origin: string, token: string): string {
  return `${origin}/pozvanka/${token}`;
}

/** A mailto: link with a ready Czech + English message; opens the admin's mail app. */
export function inviteMailto(opts: {
  to: string;
  link: string;
  chata: string;
  inviter?: string | null;
  admin: boolean;
}): string {
  const who = opts.inviter ? `${opts.inviter} vás zve` : "Zveme vás";
  const whoEn = opts.inviter ? `${opts.inviter} invites you` : "You're invited";
  const roleCs = opts.admin ? " jako správce" : "";
  const roleEn = opts.admin ? " as an admin" : "";
  const subject = `Pozvánka do chaty ${opts.chata} / Invitation to ${opts.chata}`;
  const body = [
    `${who}${roleCs} do chaty ${opts.chata} v aplikaci My Chata.`,
    `Pozvánku přijmete zde (platí 7 dní):`,
    opts.link,
    "",
    `${whoEn}${roleEn} to ${opts.chata} on My Chata.`,
    `Accept here (valid for 7 days):`,
    opts.link,
  ].join("\n");
  return `mailto:${encodeURIComponent(opts.to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
