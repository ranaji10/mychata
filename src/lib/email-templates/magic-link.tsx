import * as React from "react";
import { EmailLayout, type EmailLang } from "./layout";

// Not used by the app (it signs in with a password or Google). Kept only because the
// auth email hook must answer every type; branded so a stray send still looks right.
interface MagicLinkEmailProps {
  lang?: EmailLang;
  siteName?: string;
  siteUrl?: string;
  recipient?: string;
  email?: string;
  confirmationUrl: string;
}

export const MagicLinkEmail = ({ confirmationUrl, lang }: MagicLinkEmailProps) => (
  <EmailLayout
    lang={lang}
    preview={{ cs: "Přihlášení do MyChata", en: "Sign in to MyChata" }}
    heading={{ cs: "Přihlášení do MyChata", en: "Sign in to MyChata" }}
    paragraphs={[{ cs: "Klepněte na tlačítko a přihlásíte se.", en: "Tap the button to sign in." }]}
    button={{ label: { cs: "Přihlásit se", en: "Sign in" }, href: confirmationUrl }}
  />
);

export default MagicLinkEmail;
