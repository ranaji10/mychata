import * as React from "react";
import { render } from "@react-email/render";
import { EmailAPIError, sendLovableEmail } from "@lovable.dev/email-js";
import { TEMPLATES } from "./registry";

// Server-only: reads LOVABLE_API_KEY. Never import from client components.

// Configuration baked in at scaffold time
const SITE_NAME = "MyChata";
// SENDER_DOMAIN is the verified sender subdomain FQDN (e.g., "notify.example.com").
// It MUST match the subdomain delegated to Lovable's nameservers. NEVER use the root domain.
const SENDER_DOMAIN = "notify.mychata.cz";
// FROM_DOMAIN is the domain shown in the From: header (e.g., "example.com").
// Can be the root domain when display_from_root is enabled — this is cosmetic only.
const FROM_DOMAIN = "notify.mychata.cz";
const FROM_LOCAL = "no-reply";
const REPLY_TO = "podpora@mychata.cz";

export type SendTemplateEmailResult =
  { sent: true } | { sent: false; reason: "recipient_suppressed" };

export interface SendTemplateEmailOptions {
  templateData?: Record<string, any>;
  /** Dedupes retries of the same logical send; defaults to a random UUID (no dedupe). */
  idempotencyKey?: string;
  replyTo?: string;
}

/**
 * Renders a registered template and sends it through Lovable's managed email
 * API. Suppression, retries, and rate limits are enforced by Lovable
 * server-side. A suppressed recipient is an expected outcome
 * ({ sent: false }); any other failure throws — EmailAPIError exposes
 * .code and .status for branching.
 */
export async function sendTemplateEmail(
  templateName: string,
  to: string,
  options: SendTemplateEmailOptions = {},
): Promise<SendTemplateEmailResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const template = TEMPLATES[templateName];
  if (!template) {
    throw new Error(
      `Template '${templateName}' not found. Available: ${Object.keys(TEMPLATES).join(", ")}`,
    );
  }

  // Template-level `to` takes precedence — notification templates always
  // send to their fixed address.
  const recipient = template.to || to;
  if (!recipient) {
    throw new Error("Recipient is required (the template defines no fixed recipient)");
  }

  const templateData = options.templateData ?? {};
  const element = React.createElement(template.component, templateData);
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject =
    typeof template.subject === "function" ? template.subject(templateData) : template.subject;

  try {
    await sendLovableEmail(
      {
        to: recipient,
        from: { name: SITE_NAME, address: `${FROM_LOCAL}@${FROM_DOMAIN}` },
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: "transactional",
        label: templateName,
        idempotency_key: options.idempotencyKey || crypto.randomUUID(),
        reply_to: options.replyTo || REPLY_TO,
      },
      { apiKey, sendUrl: process.env["LOVABLE_SEND_URL"] },
    );
  } catch (error) {
    if (error instanceof EmailAPIError && error.code === "recipient_suppressed") {
      return { sent: false, reason: "recipient_suppressed" };
    }
    throw error;
  }

  return { sent: true };
}

export interface NotificationEmailInput {
  /** Recipient address. */
  to: string;
  subject: string;
  heading: string;
  paragraph: string;
  buttonLabel: string;
  /** Absolute https://mychata.cz/... link. */
  buttonUrl: string;
  /** Stable id of the triggering event (e.g. the queue row id) so retries don't send twice. */
  idempotencyKey: string;
}

/** Sends the generic "notification" app email. Server-only; not called anywhere yet (CC-3). */
export function sendNotificationEmail(
  input: NotificationEmailInput,
): Promise<SendTemplateEmailResult> {
  const { to, idempotencyKey, ...templateData } = input;
  return sendTemplateEmail("notification", to, {
    templateData,
    idempotencyKey: `notification-${idempotencyKey}`,
  });
}
