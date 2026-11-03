// T-054: mail apps must not machine-translate the brand name ("MyChata" became "MyChat").
import { describe, expect, it } from "vitest";
import { render } from "@react-email/render";
import * as React from "react";
import { SignupEmail } from "@/lib/email-templates/signup";
import { InviteEmail } from "@/lib/email-templates/invite";
import { RecoveryEmail } from "@/lib/email-templates/recovery";
import { keepBrand } from "@/lib/email-templates/layout";
import { template } from "@/lib/email-templates/notification";

const url = "https://example.test/confirm";

describe("T-054 brand name is not translated in e-mails", () => {
  it("marks the whole e-mail as not to be translated", async () => {
    const html = await render(React.createElement(SignupEmail, { confirmationUrl: url }));
    expect(html).toMatch(/<html[^>]*translate="no"/);
    expect(html).toMatch(/<body[^>]*translate="no"/);
    expect(html).toContain('name="google" content="notranslate"');
  });

  it.each([
    ["signup", React.createElement(SignupEmail, { confirmationUrl: url })],
    ["invite", React.createElement(InviteEmail, { confirmationUrl: url })],
    ["recovery", React.createElement(RecoveryEmail, { confirmationUrl: url })],
    ["notification", React.createElement(template.component, { heading: "Novinka v MyChata" })],
  ])("every visible MyChata in the %s e-mail is wrapped", async (_name, el) => {
    const html = await render(el);
    // The hidden inbox-preview line is plain text by design; check what the reader sees.
    const body = html
      .slice(html.indexOf("<body"))
      .replace(/<div[^>]*data-skip-in-text="true">[\s\S]*?<\/div><\/div>/, "");
    const bare = body.replace(/<span translate="no" class="notranslate">MyChata<\/span>/g, "");
    expect(body).toContain('<span translate="no" class="notranslate">MyChata</span>');
    // Only the link URL (mychata.cz) may remain; no unwrapped brand name in the text.
    expect(bare).not.toMatch(/MyChata/);
  });

  it("keepBrand leaves text without the brand unchanged", () => {
    expect(keepBrand("Obnovení hesla")).toBe("Obnovení hesla");
  });
});
