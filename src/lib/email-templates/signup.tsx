import * as React from 'react'
import { EmailLayout } from './layout'

interface SignupEmailProps {
  confirmationUrl: string
}

export const SignupEmail = ({ confirmationUrl }: SignupEmailProps) => (
  <EmailLayout
    preview="Potvrďte svůj e-mail pro MyChata"
    heading={{ cs: 'Potvrďte svůj e-mail', en: 'Confirm your email' }}
    paragraphs={[
      {
        cs: 'Děkujeme za registraci v MyChata. Klepněte na tlačítko níže a vrátíme vás tam, kde jste skončili.',
        en: 'Thanks for signing up to MyChata. Tap the button below and we will take you back to where you left off.',
      },
    ]}
    button={{ label: { cs: 'Potvrdit e-mail', en: 'Confirm email' }, href: confirmationUrl }}
    footer={{
      cs: 'Pokud jste se neregistrovali, tento e-mail můžete ignorovat.',
      en: "If you didn't sign up, you can ignore this email.",
    }}
  />
)

export default SignupEmail
