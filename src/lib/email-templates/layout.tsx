import * as React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

// Shared look for every MyChata email (docs/product/design.md, family brand).
// Emails can't read CSS variables, so the design tokens are copied here as literals.
export const SITE_URL = "https://mychata.cz";

const C = {
  primary: "#1F7A4D",
  primarySoft: "#E7F3EA",
  foreground: "#14201A",
  muted: "#4E5F55",
  border: "#E6ECE7",
};
const FONT = "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif";

// Mail apps (Apple Mail, Gmail, Outlook) offer to machine-translate Czech e-mails and
// turn "MyChata" into "MyChat" (T-054). The e-mail is already bilingual, so the whole
// body is marked translate="no", and the brand name is also wrapped on its own for
// clients that strip attributes from <html>/<body>.
export const BRAND = "MyChata";

export function keepBrand(text: string): React.ReactNode {
  if (!text.includes(BRAND)) return text;
  const parts = text.split(BRAND);
  return parts.map((part, i) => (
    <React.Fragment key={i}>
      {part}
      {i < parts.length - 1 ? (
        <span translate="no" className="notranslate">
          {BRAND}
        </span>
      ) : null}
    </React.Fragment>
  ));
}

export interface Bilingual {
  cs: string;
  en: string;
}

interface EmailLayoutProps {
  preview: string;
  heading: Bilingual;
  paragraphs: Bilingual[];
  button?: { label: Bilingual; href: string };
  code?: string;
  footer?: Bilingual;
}

export const EmailLayout = ({
  preview,
  heading,
  paragraphs,
  button,
  code,
  footer,
}: EmailLayoutProps) => (
  <Html lang="cs" dir="ltr" translate="no">
    <Head>
      <meta name="google" content="notranslate" />
    </Head>
    <Preview>{preview}</Preview>
    <Body style={main} translate="no" className="notranslate">
      <Container style={container}>
        <Text style={brand}>
          <Link href={SITE_URL} style={brandLink}>
            {keepBrand(BRAND)}
          </Link>
        </Text>
        <Heading style={h1}>{keepBrand(heading.cs)}</Heading>
        {heading.en ? (
          <Text style={enHeading}>{keepBrand(heading.en)}</Text>
        ) : (
          <Text style={{ margin: "0 0 20px" }} />
        )}
        {paragraphs.map((p, i) => (
          <Section key={i} style={{ margin: "0 0 20px" }}>
            <Text style={text}>{keepBrand(p.cs)}</Text>
            {p.en ? <Text style={en}>{keepBrand(p.en)}</Text> : null}
          </Section>
        ))}
        {code ? <Text style={codeStyle}>{code}</Text> : null}
        {button ? (
          <Section style={{ margin: "8px 0 28px" }}>
            <Button style={buttonStyle} href={button.href}>
              {keepBrand(
                button.label.en ? `${button.label.cs} · ${button.label.en}` : button.label.cs,
              )}
            </Button>
          </Section>
        ) : null}
        <Hr style={hr} />
        {footer ? (
          <>
            <Text style={small}>{keepBrand(footer.cs)}</Text>
            <Text style={smallEn}>{keepBrand(footer.en)}</Text>
          </>
        ) : null}
        <Text style={small}>
          <Link href={SITE_URL} style={footerLink}>
            mychata.cz
          </Link>
        </Text>
      </Container>
    </Body>
  </Html>
);

const main = { backgroundColor: "#ffffff", fontFamily: FONT, margin: 0, padding: 0 };
const container = { maxWidth: "520px", margin: "0 auto", padding: "32px 24px" };
const brand = { fontSize: "18px", fontWeight: 800 as const, margin: "0 0 24px" };
const brandLink = { color: C.primary, textDecoration: "none" };
const h1 = {
  fontSize: "24px",
  lineHeight: "1.3",
  fontWeight: 700 as const,
  color: C.foreground,
  margin: "0 0 4px",
};
const enHeading = { fontSize: "16px", color: C.muted, margin: "0 0 24px" };
const text = { fontSize: "17px", lineHeight: "1.6", color: C.foreground, margin: "0 0 4px" };
const en = { fontSize: "16px", lineHeight: "1.5", color: C.muted, margin: 0 };
const buttonStyle = {
  backgroundColor: C.primary,
  color: "#ffffff",
  fontSize: "17px",
  fontWeight: 700 as const,
  borderRadius: "12px",
  padding: "15px 24px",
  textDecoration: "none",
  display: "inline-block",
};
const codeStyle = {
  fontSize: "30px",
  fontWeight: 800 as const,
  letterSpacing: "6px",
  color: C.primary,
  backgroundColor: C.primarySoft,
  borderRadius: "12px",
  padding: "14px 20px",
  display: "inline-block",
  margin: "0 0 24px",
};
const hr = { borderColor: C.border, margin: "8px 0 20px" };
const small = { fontSize: "16px", lineHeight: "1.5", color: C.muted, margin: "0 0 2px" };
const smallEn = { ...small, margin: "0 0 12px" };
const footerLink = { color: C.primary, textDecoration: "underline" };
