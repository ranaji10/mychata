import * as React from 'react'
import { EmailLayout } from './layout'

interface RecoveryEmailProps {
  confirmationUrl: string
}

export const RecoveryEmail = ({ confirmationUrl }: RecoveryEmailProps) => (
  <EmailLayout
    preview="Obnovení hesla k MyChata"
    heading={{ cs: 'Nastavte si nové heslo', en: 'Set a new password' }}
    paragraphs={[
      {
        cs: 'Požádali jste o obnovení hesla k MyChata. Klepněte na tlačítko a zvolte si nové.',
        en: 'You asked to reset your MyChata password. Tap the button to choose a new one.',
      },
    ]}
    button={{ label: { cs: 'Nastavit heslo', en: 'Set password' }, href: confirmationUrl }}
    footer={{
      cs: 'Pokud jste o to nežádali, e-mail ignorujte. Vaše heslo zůstane stejné.',
      en: "If you didn't ask for this, ignore this email. Your password stays the same.",
    }}
  />
)

export default RecoveryEmail
