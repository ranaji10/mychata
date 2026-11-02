import * as React from "react";
import { EmailLayout } from "./layout";

interface ReauthenticationEmailProps {
  token: string;
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailLayout
    preview="Ověřovací kód MyChata"
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
