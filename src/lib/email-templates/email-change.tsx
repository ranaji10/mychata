import * as React from "react";
import { EmailLayout, type EmailLang } from "./layout";

interface EmailChangeEmailProps {
  lang?: EmailLang;
  siteName?: string;
  siteUrl?: string;
  recipient?: string;
  email?: string;
  oldEmail?: string;
  newEmail?: string;
  confirmationUrl: string;
}

export const EmailChangeEmail = ({
  oldEmail,
  newEmail,
  confirmationUrl,
  lang,
}: EmailChangeEmailProps) => (
  <EmailLayout
    lang={lang}
    preview={{ cs: "Potvrďte změnu e-mailu v MyChata", en: "Confirm your MyChata email change" }}
    heading={{ cs: "Potvrďte změnu e-mailu", en: "Confirm your email change" }}
    paragraphs={[
      {
        cs: `Požádali jste o změnu e-mailu v MyChata${oldEmail ? ` z ${oldEmail}` : ""}${newEmail ? ` na ${newEmail}` : ""}.`,
        en: `You asked to change your MyChata email${oldEmail ? ` from ${oldEmail}` : ""}${newEmail ? ` to ${newEmail}` : ""}.`,
      },
    ]}
    button={{ label: { cs: "Potvrdit změnu", en: "Confirm change" }, href: confirmationUrl }}
    footer={{
      cs: "Pokud jste o změnu nežádali, napište nám na podpora@mychata.cz.",
      en: "If you didn't ask for this, write to podpora@mychata.cz.",
    }}
  />
);

export default EmailChangeEmail;
