import * as React from "react";
import { createAuthEmailHandler } from "@lovable.dev/email-js";
import { createFileRoute } from "@tanstack/react-router";
import { SignupEmail } from "@/lib/email-templates/signup";
import { InviteEmail } from "@/lib/email-templates/invite";
import { MagicLinkEmail } from "@/lib/email-templates/magic-link";
import { RecoveryEmail } from "@/lib/email-templates/recovery";
import { EmailChangeEmail } from "@/lib/email-templates/email-change";
import { ReauthenticationEmail } from "@/lib/email-templates/reauthentication";
import { authEmailLang } from "@/lib/auth-email-lang";

// Configuration
const SITE_NAME = "MyChata";
const SENDER_DOMAIN = "notify.mychata.cz";
const ROOT_DOMAIN = "mychata.cz";
const FROM_DOMAIN = "notify.mychata.cz";
const SITE_URL = `https://${ROOT_DOMAIN}`;

// The SDK handler owns verification, dispatch, and retry semantics; this file
// owns only the email decisions: subjects, templates, per-type props, and the recipient's
// language (T-057, src/lib/auth-email-lang.ts): each e-mail is in one language.
export const Route = createFileRoute("/lovable/email/auth/webhook")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: ({ request }) => {
        const handler = createAuthEmailHandler({
          apiKey: process.env["LOVABLE_API_KEY"]!,
          from: { name: SITE_NAME, address: `no-reply@${FROM_DOMAIN}` },
          replyTo: "podpora@mychata.cz",
          senderDomain: SENDER_DOMAIN,
          sendUrl: process.env["LOVABLE_SEND_URL"],
          emails: {
            signup: async (data) => {
              const lang = await authEmailLang(data);
              return {
                subject: lang === "en" ? "Confirm your email" : "Potvrďte svůj e-mail",
                element: React.createElement(SignupEmail, {
                  lang,
                  siteName: SITE_NAME,
                  siteUrl: SITE_URL,
                  recipient: data.email,
                  confirmationUrl: data.url,
                }),
              };
            },
            invite: async (data) => {
              const lang = await authEmailLang(data);
              return {
                subject: lang === "en" ? "Invitation to MyChata" : "Pozvánka do MyChata",
                element: React.createElement(InviteEmail, {
                  lang,
                  siteName: SITE_NAME,
                  siteUrl: SITE_URL,
                  confirmationUrl: data.url,
                }),
              };
            },
            magiclink: async (data) => {
              const lang = await authEmailLang(data);
              return {
                subject: lang === "en" ? "Sign in to MyChata" : "Přihlášení do MyChata",
                element: React.createElement(MagicLinkEmail, {
                  lang,
                  siteName: SITE_NAME,
                  confirmationUrl: data.url,
                }),
              };
            },
            recovery: async (data) => {
              const lang = await authEmailLang(data);
              return {
                subject: lang === "en" ? "Reset your password" : "Obnovení hesla",
                element: React.createElement(RecoveryEmail, {
                  lang,
                  siteName: SITE_NAME,
                  confirmationUrl: data.url,
                }),
              };
            },
            email_change: async (data) => {
              const lang = await authEmailLang(data);
              return {
                subject: lang === "en" ? "Confirm your email change" : "Potvrďte změnu e-mailu",
                element: React.createElement(EmailChangeEmail, {
                  lang,
                  siteName: SITE_NAME,
                  oldEmail: data.old_email ?? "",
                  email: data.email,
                  newEmail: data.new_email ?? "",
                  confirmationUrl: data.url,
                }),
              };
            },
            reauthentication: async (data) => {
              const lang = await authEmailLang(data);
              return {
                subject: lang === "en" ? "Verification code" : "Ověřovací kód",
                element: React.createElement(ReauthenticationEmail, {
                  lang,
                  token: data.token ?? "",
                }),
              };
            },
          },
        });
        return handler(request);
      },
    },
  },
});
