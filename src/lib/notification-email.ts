// What each stored notification says by e-mail (T-053). Pure: the queue (notification-queue.server.ts)
// renders a row with this and hands the result to sendEmail, which picks the recipient's language
// (T-057): every text is a [Czech, English] pair. Subjects carry no names (T-005).
import { fmtDate } from "@/lib/data";

export const SITE_URL = "https://mychata.cz";

export type StoredNotificationKind =
  | "invitation"
  | "booking_awaiting_approval"
  | "booking_decided"
  | "guest_request_decided"
  | "ownership_offered"
  | "task_mentioned"
  | "leaving_checklist"
  | "message_to_admin"
  | "debt_reminder"
  | "payment_claimed"
  | "payment_confirmed"
  | "payment_rejected";

/** Fields the 0038 triggers and functions put in notifications.payload (all optional). */
export interface NotificationPayload {
  account_name?: unknown;
  amount?: unknown;
  approved?: unknown;
  author_name?: unknown;
  body?: unknown;
  booking_id?: unknown;
  claim_id?: unknown;
  calendar_token?: unknown;
  decided_by?: unknown;
  done?: unknown;
  end_date?: unknown;
  excerpt?: unknown;
  expense_id?: unknown;
  expense_title?: unknown;
  expires_at?: unknown;
  from_member_id?: unknown;
  from_name?: unknown;
  invited_by?: unknown;
  note?: unknown;
  offer_id?: unknown;
  property_name?: unknown;
  requester_name?: unknown;
  skipped?: unknown;
  start_date?: unknown;
  submitted_at?: unknown;
  task_id?: unknown;
  task_title?: unknown;
  task_title_en?: unknown;
  token?: unknown;
}

export interface NotificationRow {
  id: string;
  kind: StoredNotificationKind | string;
  payload: NotificationPayload;
}

export interface RenderedEmail {
  subject: [cs: string, en: string];
  heading: [cs: string, en: string];
  /** Paragraphs, each Czech + English. */
  paragraphs: [cs: string, en: string][];
  button: [cs: string, en: string];
  /** Always an absolute https://mychata.cz link built here, never one taken from the payload. */
  url: string;
}

/** Text from the payload on one line: a blank line would start a new paragraph in the template. */
const s = (v: unknown) =>
  (typeof v === "string" ? v : v == null ? "" : String(v)).replace(/\s*\n\s*/g, " ").trim();
const dates = (p: NotificationPayload) => `${fmtDate(s(p.start_date))} – ${fmtDate(s(p.end_date))}`;
/** Ids and tokens go into a path segment, so only safe characters are kept. */
const seg = (v: unknown) => encodeURIComponent(s(v).replace(/[^A-Za-z0-9_-]/g, ""));
const link = (path: string) => `${SITE_URL}${path}`;
const kc = (n: unknown) => `${Math.round(Number(n) || 0).toLocaleString("cs-CZ")} Kč`;

/** The e-mail for one notification, or null for a kind this version doesn't know. */
export function renderNotificationEmail(row: NotificationRow): RenderedEmail | null {
  const p: NotificationPayload = row.payload ?? {};
  const where = s(p.property_name);
  switch (row.kind) {
    case "invitation": {
      const to = s(p.property_name) || s(p.account_name);
      const from = s(p.invited_by);
      return {
        subject: ["Pozvánka do MyChata", "Invitation to MyChata"],
        heading: [`Pozvánka do: ${to}`, `Invitation to ${to}`],
        paragraphs: [
          [
            `${from ? `${from} vás zve` : "Jste zváni"} ke sdílené chatě v MyChata: kalendář pobytů, úkoly, výdaje a příručka na jednom místě.`,
            `${from ? `${from} invites you` : "You're invited"} to a shared cottage on MyChata: stays, tasks, expenses and the house manual in one place.`,
          ],
          [
            `Pozvánka platí do ${fmtDate(s(p.expires_at))}.`,
            `The invitation is valid until ${fmtDate(s(p.expires_at))}.`,
          ],
        ],
        button: ["Přijmout pozvánku", "Accept the invitation"],
        url: link(`/pozvanka/${seg(p.token)}`),
      };
    }
    case "booking_awaiting_approval":
      return {
        subject: ["Pobyt ke schválení", "A stay to approve"],
        heading: ["Pobyt čeká na vaše schválení", "A stay is waiting for your approval"],
        paragraphs: [
          [
            `${s(p.requester_name)} chce přijet na ${where}: ${dates(p)}.`,
            `${s(p.requester_name)} would like to stay at ${where}: ${dates(p)}.`,
          ],
        ],
        button: ["Schválit nebo zamítnout", "Approve or decline"],
        url: link("/schvalovani"),
      };
    case "booking_decided": {
      const ok = p.approved === true;
      const by = s(p.decided_by);
      return {
        subject: ok ? ["Pobyt potvrzen", "Stay confirmed"] : ["Pobyt zamítnut", "Stay declined"],
        heading: ok
          ? ["Váš pobyt je potvrzený", "Your stay is confirmed"]
          : ["Váš pobyt nebyl schválen", "Your stay was not approved"],
        paragraphs: [
          [
            `${where}, ${dates(p)}.${by ? (ok ? ` Potvrdil(a) ${by}.` : ` Rozhodl(a) ${by}.`) : ""}`,
            `${where}, ${dates(p)}.${by ? (ok ? ` Confirmed by ${by}.` : ` Decided by ${by}.`) : ""}`,
          ],
          ...(ok
            ? []
            : ([
                [
                  "Podívejte se do kalendáře na jiný volný termín.",
                  "Have a look at the calendar for other free dates.",
                ],
              ] as [string, string][])),
        ],
        button: ok
          ? ["Zobrazit pobyt", "View the stay"]
          : ["Otevřít kalendář", "Open the calendar"],
        url: ok ? link(`/rezervace/${seg(p.booking_id)}`) : link("/kalendar"),
      };
    }
    case "guest_request_decided": {
      const ok = p.approved === true;
      const token = s(p.calendar_token);
      return {
        subject: ok
          ? ["Žádost o pobyt schválena", "Request approved"]
          : ["Žádost o pobyt", "Your request"],
        heading: ok
          ? ["Vaše žádost o pobyt byla schválena", "Your stay request was approved"]
          : ["Vaše žádost o pobyt nebyla schválena", "Your stay request was not approved"],
        paragraphs: [[`${where}, ${dates(p)}.`, `${where}, ${dates(p)}.`]],
        button: token
          ? ["Zobrazit moje žádosti", "See my requests"]
          : ["Otevřít MyChata", "Open MyChata"],
        url: token ? link(`/verejne/kalendar/${seg(token)}`) : SITE_URL,
      };
    }
    case "ownership_offered":
      return {
        subject: ["Nabídka převzetí účtu", "An account is offered to you"],
        heading: [
          `${s(p.from_name)} vám předává účet „${s(p.account_name)}“`,
          `${s(p.from_name)} is handing you “${s(p.account_name)}”`,
        ],
        paragraphs: [
          [
            "Jako vlastník budete spravovat účet, členy a typ účtu. Nabídku přijmete nebo odmítnete v Členech a oprávněních.",
            "As the owner you will manage the account, its members and its type. Accept or decline in Members & permissions.",
          ],
        ],
        button: ["Rozhodnout", "Decide"],
        url: link("/clenove"),
      };
    case "task_mentioned":
      return {
        subject: ["Zmínka v úkolu", "You were mentioned on a task"],
        heading: [
          `${s(p.author_name)} vás zmínil(a) v úkolu`,
          `${s(p.author_name)} mentioned you on a task`,
        ],
        paragraphs: [
          [`${s(p.task_title)} (${where})`, `${s(p.task_title_en) || s(p.task_title)} (${where})`],
          [`„${s(p.excerpt)}“`, ""],
        ],
        button: ["Otevřít úkol", "Open the task"],
        url: link(`/ukoly/${seg(p.task_id)}`),
      };
    case "leaving_checklist": {
      const done = Array.isArray(p.done) ? (p.done as unknown[]).map(s) : [];
      const skipped = Array.isArray(p.skipped)
        ? (p.skipped as { item?: unknown; reason?: unknown }[]).map(
            (x) => `${s(x.item)}${s(x.reason) ? ` (${s(x.reason)})` : ""}`,
          )
        : [];
      const paragraphs: [string, string][] = [
        [
          `${s(p.from_name) || "Předchozí návštěva"} odjel(a) z ${where} ${fmtDate(s(p.submitted_at))}. Váš pobyt: ${dates(p)}.`,
          `${s(p.from_name) || "The previous visitor"} left ${where} on ${fmtDate(s(p.submitted_at))}. Your stay: ${dates(p)}.`,
        ],
      ];
      if (done.length)
        paragraphs.push([`Hotovo: ${done.join(", ")}.`, `Done: ${done.join(", ")}.`]);
      if (skipped.length)
        paragraphs.push([`Nehotovo: ${skipped.join(", ")}.`, `Not done: ${skipped.join(", ")}.`]);
      if (s(p.note)) paragraphs.push([`Vzkaz: „${s(p.note)}“`, ""]);
      return {
        subject: ["Předání chaty před vaším pobytem", "Handover before your stay"],
        heading: ["Jak chatu zanechal předchozí host", "How the cottage was left for you"],
        paragraphs,
        button: ["Otevřít předání", "Open the handover"],
        url: link("/predani"),
      };
    }
    case "message_to_admin":
      return {
        subject: ["Zpráva pro správce", "A message for the admins"],
        heading: [
          `${s(p.from_name)} píše správcům účtu ${s(p.account_name)}`,
          `${s(p.from_name)} wrote to the admins of ${s(p.account_name)}`,
        ],
        paragraphs: [
          [`„${s(p.body)}“`, ""],
          [
            "Odpovězte v aplikaci nebo osobně; adresy si MyChata nesdílí.",
            "Reply in the app or in person; MyChata doesn't share addresses.",
          ],
        ],
        button: ["Otevřít MyChata", "Open MyChata"],
        url: link("/upozorneni"),
      };
    case "debt_reminder":
      return {
        subject: ["Připomínka vyrovnání", "A reminder to settle up"],
        heading: [
          `${s(p.from_name)} připomíná vyrovnání`,
          `${s(p.from_name)} reminds you to settle up`,
        ],
        paragraphs: [
          [`Za ${where} dlužíte ${kc(p.amount)}.`, `You owe ${kc(p.amount)} for ${where}.`],
        ],
        button: ["Vyrovnat", "Settle up"],
        url: link("/vydaje/vyrovnani"),
      };
    case "payment_claimed": {
      const what = s(p.expense_title);
      return {
        subject: ["Potvrďte přijetí platby", "Please confirm a payment"],
        heading: [
          `${s(p.from_name)} vám poslal(a) ${kc(p.amount)}`,
          `${s(p.from_name)} says they paid you ${kc(p.amount)}`,
        ],
        paragraphs: [
          [
            `${where}${what ? `, výdaj: ${what}` : ""}. Potvrďte, že platba přišla, nebo dejte vědět, že ne.`,
            `${where}${what ? `, expense: ${what}` : ""}. Confirm that the money arrived, or say that it didn't.`,
          ],
        ],
        button: ["Potvrdit nebo odmítnout", "Confirm or decline"],
        url: link("/vydaje/vyrovnani"),
      };
    }
    case "payment_confirmed":
      return {
        subject: ["Platba potvrzena", "Payment confirmed"],
        heading: [
          `${s(p.from_name)} potvrdil(a) vaši platbu`,
          `${s(p.from_name)} confirmed your payment`,
        ],
        paragraphs: [[`${kc(p.amount)}, ${where}.`, `${kc(p.amount)}, ${where}.`]],
        button: ["Zobrazit výdaje", "View expenses"],
        url: link("/vydaje"),
      };
    case "payment_rejected":
      return {
        subject: ["Platba zatím nepřišla", "Payment not received yet"],
        heading: [
          `${s(p.from_name)} platbu zatím nevidí`,
          `${s(p.from_name)} hasn't received the payment yet`,
        ],
        paragraphs: [
          [
            `${kc(p.amount)}, ${where}. Ověřte platbu a domluvte se spolu; dluh zůstává otevřený.`,
            `${kc(p.amount)}, ${where}. Check the payment and talk to each other; the debt stays open.`,
          ],
        ],
        button: ["Otevřít vyrovnání", "Open settle up"],
        url: link("/vydaje/vyrovnani"),
      };
    default:
      return null;
  }
}
