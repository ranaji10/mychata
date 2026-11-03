// The one door for app e-mail (T-005, T-053). Nothing else calls Lovable's send function, so own
// hosting (T-002) changes this file only. Server-only: never import from client code.
import type { RenderedEmail } from "@/lib/notification-email";

export type EmailTemplate = "notification";

export interface SendEmailInput {
  to: string;
  template: EmailTemplate;
  data: RenderedEmail;
  /** The recipient's language (T-057); Czech when unknown. */
  lang?: "cs" | "en";
  /** Stable per logical send (the notification id), so a retry never mails twice. */
  idempotencyKey: string;
}

export type SendEmailResult = { sent: true } | { sent: false; reason: "recipient_suppressed" };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const { sendNotificationEmail } = await import("@/lib/email-templates/send-email");
  const lang = input.lang === "en" ? "en" : "cs";
  const one = (pair: [string, string]) => (lang === "en" ? pair[1] || pair[0] : pair[0]);
  const d = input.data;
  return sendNotificationEmail({
    to: input.to,
    lang,
    subject: one(d.subject),
    heading: one(d.heading),
    paragraph: d.paragraphs.map(one).filter(Boolean).join("\n\n"),
    buttonLabel: one(d.button),
    buttonUrl: d.url,
    idempotencyKey: input.idempotencyKey,
  });
}
