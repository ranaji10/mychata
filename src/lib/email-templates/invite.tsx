import * as React from "react";
import { EmailLayout } from "./layout";

// Not used by the app (invitations are the app's own /pozvanka links). Kept only because
// the auth email hook must answer every type.
interface InviteEmailProps {
  siteName?: string;
  siteUrl?: string;
  recipient?: string;
  email?: string;
  confirmationUrl: string;
}

export const InviteEmail = ({ confirmationUrl }: InviteEmailProps) => (
  <EmailLayout
    preview="Pozvánka do MyChata"
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
