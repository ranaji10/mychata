// Plain-language messages for the error codes our database functions raise (T-056).
// Unknown errors fall back to the raw message so nothing fails silently.
type T = (cs: string, en: string) => string;

const KNOWN: Record<string, [string, string]> = {
  nothing_owed: ["Tento člověk vám nic nedluží.", "This person doesn't owe you anything."],
  rate_limited: [
    "Dnes už jste to poslali. Zkuste to zítra.",
    "You've already sent this today. Try again tomorrow.",
  ],
  no_admin: ["Chata zatím nemá jiného správce.", "The cottage has no other admin yet."],
  not_a_member: ["Nejste členem této chaty.", "You're not a member of this cottage."],
  member_not_in_account: [
    "Tento člověk už není členem chaty.",
    "This person is no longer a member of the cottage.",
  ],
  invalid_body: [
    "Napište text (nejvýš 2000 znaků).",
    "Please write a message (2,000 characters at most).",
  ],
  too_many_mentions: ["Označit můžete nejvýš 20 lidí.", "You can mention at most 20 people."],
  mention_not_in_account: [
    "Označit můžete jen současné členy chaty.",
    "You can only mention current members of the cottage.",
  ],
  only_payer_covers: [
    "Uhradit vše může jen ten, kdo výdaj zaplatil.",
    "Only the person who paid can cover it all.",
  ],
  bad_capacity: [
    "Kapacita musí být číslo od 1 do 500.",
    "Capacity must be a number from 1 to 500.",
  ],
  bad_beds: ["Počet lůžek musí být od 1 do 500.", "Beds must be from 1 to 500."],
  // T-059: update_property_details() codes and the 0042 column checks.
  bad_rooms: ["Počet pokojů musí být od 1 do 200.", "Rooms must be from 1 to 200."],
  properties_rooms_check: ["Počet pokojů musí být od 1 do 200.", "Rooms must be from 1 to 200."],
  bad_overlap: ["Počet hostů naráz musí být od 1 do 500.", "Guests at once must be from 1 to 500."],
  properties_overlap_max_guests_check: [
    "Počet hostů naráz musí být od 1 do 500.",
    "Guests at once must be from 1 to 500.",
  ],
  "invalid input syntax for type integer": [
    "Zadejte celé číslo, bez desetinné čárky.",
    "Enter a whole number, without decimals.",
  ],
  bad_time: ["Čas napište jako 15:00.", "Write the time like 15:00."],
  claim_not_found: ["Tato platba už není k vyřízení.", "This payment is no longer waiting."],
  already_decided: ["Už je rozhodnuto.", "This has already been decided."],
  only_receiver_confirms: [
    "Platbu potvrzuje ten, kdo ji dostal, nebo správce.",
    "The person who received the money, or an admin, confirms it.",
  ],
  nothing_changed: [
    "Nic se nezměnilo. Obnovte stránku a zkuste to znovu.",
    "Nothing changed. Reload the page and try again.",
  ],
};

export function rpcErrorCode(message: string): string | null {
  const m = message.trim().toLowerCase();
  return Object.keys(KNOWN).find((code) => m === code || m.includes(code)) ?? null;
}

export function friendlyError(message: string, t: T): string {
  const code = rpcErrorCode(message);
  if (!code) return message;
  const pair = KNOWN[code];
  if (!pair) return message;
  const [cs, en] = pair;
  return t(cs, en);
}
