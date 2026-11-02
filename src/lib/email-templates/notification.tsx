import * as React from 'react'
import { EmailLayout, SITE_URL } from './layout'
import type { TemplateEntry } from './registry'

// Generic app notification: subject, heading, one paragraph, one button.
// The caller passes the text already in the recipient's language.
export interface NotificationEmailProps {
  subject?: string
  heading?: string
  paragraph?: string
  buttonLabel?: string
  buttonUrl?: string
}

const NotificationEmail = ({ heading, paragraph, buttonLabel, buttonUrl }: NotificationEmailProps) => {
  const title = heading || 'Novinka v MyChata'
  return (
    <EmailLayout
      preview={title}
      heading={{ cs: title, en: '' }}
      paragraphs={paragraph ? [{ cs: paragraph, en: '' }] : []}
      button={{
        label: { cs: buttonLabel || 'Otevřít MyChata', en: '' },
        href: buttonUrl || SITE_URL,
      }}
    />
  )
}

export const template = {
  component: NotificationEmail,
  subject: (data: Record<string, any>) => (data.subject as string) || 'Novinka v MyChata',
  displayName: 'Notification',
  previewData: {
    subject: 'Nový pobyt na chatě',
    heading: 'Jana si zarezervovala pobyt',
    paragraph: 'Jana Nováková přijede 13. 11. a odjede 16. 11. Podívejte se do kalendáře.',
    buttonLabel: 'Otevřít kalendář',
    buttonUrl: 'https://mychata.cz/kalendar',
  },
} satisfies TemplateEntry
