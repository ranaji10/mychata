import * as React from "react";
import { EmailLayout, type EmailLang } from "./layout";

interface SignupEmailProps {
  lang?: EmailLang;
  siteName?: string;
  siteUrl?: string;
  recipient?: string;
  email?: string;
  confirmationUrl: string;
}

export const SignupEmail = ({ confirmationUrl, lang }: SignupEmailProps) => (
  <EmailLayout
    lang={lang}
    preview={{ cs: "Potvrďte svůj e-mail pro MyChata", en: "Confirm your email for MyChata" }}
    heading={{ cs: "Potvrďte svůj e-mail", en: "Confirm your email" }}
    paragraphs={[
      {
        cs: "Děkujeme za registraci v MyChata. Klepněte na tlačítko níže a vrátíme vás tam, kde jste skončili.",
        en: "Thanks for signing up to MyChata. Tap the button below and we will take you back to where you left off.",
      },
    ]}
    button={{ label: { cs: "Potvrdit e-mail", en: "Confirm email" }, href: confirmationUrl }}
    footer={{
      cs: "Pokud jste se neregistrovali, tento e-mail můžete ignorovat.",
      en: "If you didn't sign up, you can ignore this email.",
    }}
  />
);

export default SignupEmail;
