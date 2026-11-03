/* eslint-disable @typescript-eslint/no-explicit-any -- template data is free-form at the email boundary */
import * as React from "react";
import { EmailLayout, SITE_URL, type EmailLang } from "./layout";
import type { TemplateEntry } from "./registry";

// Generic app notification: subject, heading, a paragraph, one button, all in the recipient's
// language (T-057; `lang` sets <html lang>). A blank line ("\n\n") in the paragraph starts a new
// one. The *En fields are no longer sent; they are kept so an old queued call still renders.
export interface NotificationEmailProps {
  lang?: EmailLang | undefined;
  subject?: string | undefined;
  heading?: string | undefined;
  headingEn?: string | undefined;
  paragraph?: string | undefined;
  paragraphEn?: string | undefined;
  buttonLabel?: string | undefined;
  buttonLabelEn?: string | undefined;
  buttonUrl?: string | undefined;
}

const split = (s: string | undefined) => (s ? s.split("\n\n").map((p) => p.trim()) : []);

const NotificationEmail = ({
  lang,
  heading,
  headingEn,
  paragraph,
  paragraphEn,
  buttonLabel,
  buttonLabelEn,
  buttonUrl,
}: NotificationEmailProps) => {
  const title = heading || (lang === "en" ? "News from MyChata" : "Novinka v MyChata");
  const cs = split(paragraph);
  const en = split(paragraphEn);
  return (
    <EmailLayout
      lang={lang}
      preview={title}
      heading={{ cs: title, en: headingEn ?? "" }}
      paragraphs={cs.filter(Boolean).map((p, i) => ({ cs: p, en: en[i] ?? "" }))}
      button={{
        label: {
          cs: buttonLabel || (lang === "en" ? "Open MyChata" : "Otevřít MyChata"),
          en: buttonLabelEn ?? "",
        },
        href: buttonUrl || SITE_URL,
      }}
    />
  );
};

export const template = {
  component: NotificationEmail,
  subject: (data: Record<string, any>) => (data["subject"] as string) || "Novinka v MyChata",
  displayName: "Notification",
  previewData: {
    subject: "Nový pobyt na chatě",
    heading: "Jana si zarezervovala pobyt",
    paragraph: "Jana Nováková přijede 13. 11. a odjede 16. 11. Podívejte se do kalendáře.",
    buttonLabel: "Otevřít kalendář",
    buttonUrl: "https://mychata.cz/kalendar",
  },
} satisfies TemplateEntry;
