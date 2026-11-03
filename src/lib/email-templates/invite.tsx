import * as React from "react";
import { EmailLayout, type EmailLang } from "./layout";

// Not used by the app (invitations are the app's own /pozvanka links). Kept only because
// the auth email hook must answer every type.
interface InviteEmailProps {
  lang?: EmailLang;
  siteName?: string;
  siteUrl?: string;
  recipient?: string;
  email?: string;
  confirmationUrl: string;
}

export const InviteEmail = ({ confirmationUrl, lang }: InviteEmailProps) => (
  <EmailLayout
    lang={lang}
    preview={{ cs: "Pozvánka do MyChata", en: "Invitation to MyChata" }}
    heading={{ cs: "Pozvánka do MyChata", en: "Invitation to MyChata" }}
    paragraphs={[
      {
        cs: "Klepněte na tlačítko a vytvořte si účet.",
        en: "Tap the button to create your account.",
      },
    ]}
    button={{ label: { cs: "Přijmout pozvánku", en: "Accept invitation" }, href: confirmationUrl }}
  />
);

export default InviteEmail;
