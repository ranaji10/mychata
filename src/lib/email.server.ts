// The one door for app e-mail (T-005, T-053). Nothing else calls Lovable's send function, so own
// hosting (T-002) changes this file only. Server-only: never import from client code.
import type { RenderedEmail } from "@/lib/notification-email";

export type EmailTemplate = "notification";

export interface SendEmailInput {
  to: string;
  template: EmailTemplate;
  data: RenderedEmail;
  /** "cs" = Czech only; "cs+en" = Czech with the English line under it (default). */
  lang?: "cs" | "cs+en";
  /** Stable per logical send (the notification id), so a retry never mails twice. */
  idempotencyKey: string;
}

export type SendEmailResult = { sent: true } | { sent: false; reason: "recipient_suppressed" };

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const { sendNotificationEmail } = await import("@/lib/email-templates/send-email");
  const en = (input.lang ?? "cs+en") === "cs+en";
  const d = input.data;
  return sendNotificationEmail({
    to: input.to,
    subject: d.subject,
    heading: d.heading[0],
    headingEn: en ? d.heading[1] : undefined,
    paragraph: d.paragraphs.map((p) => p[0]).join("\n\n"),
    paragraphEn: en ? d.paragraphs.map((p) => p[1]).join("\n\n") : undefined,
    buttonLabel: d.button[0],
    buttonLabelEn: en ? d.button[1] : undefined,
    buttonUrl: d.url,
    idempotencyKey: input.idempotencyKey,
  });
}
