import * as React from "react";
import { EmailLayout, type EmailLang } from "./layout";

interface ReauthenticationEmailProps {
  lang?: EmailLang;
  token: string;
}

export const ReauthenticationEmail = ({ token, lang }: ReauthenticationEmailProps) => (
  <EmailLayout
    lang={lang}
    preview={{ cs: "Ověřovací kód MyChata", en: "Your MyChata verification code" }}
    heading={{ cs: "Váš ověřovací kód", en: "Your verification code" }}
    paragraphs={[{ cs: "Zadejte tento kód v aplikaci.", en: "Enter this code in the app." }]}
    code={token}
    footer={{
      cs: "Kód brzy vyprší. Pokud jste o něj nežádali, e-mail ignorujte.",
      en: "The code expires soon. If you didn't ask for it, ignore this email.",
    }}
  />
);

export default ReauthenticationEmail;
