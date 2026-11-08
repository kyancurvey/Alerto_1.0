import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui'

const VARIANT = { sent: 'ready', retrying: 'caution', queued: 'neutral', failed: 'warning' }

// The crash message to each emergency contact, in the order they go out, with how many attempts it took.
export default function SmsDeliveries({ event, contacts }) {
  const { t } = useTranslation('events')
  const sent = event.sms.filter((entry) => entry.status === 'sent').length

  let note = null
  if (event.type === 'crash_cancelled') note = t('sms.cancelled')
  else if (event.sms.length === 0) note = event.open ? t('sms.waiting') : t('sms.none')

  return (
    <section className="evcard card" aria-labelledby="sms-title">
      <h2 id="sms-title" className="evcard__title">{t('sms.title')}</h2>
      {event.sms.length > 0 && <p className="evcard__sub">{t('sms.summary', { sent, total: event.sms.length })}</p>}
      {note && <p className="evcard__sub">{note}</p>}
      {event.sms.length > 0 && (
        <ol className="smslist">
          {event.sms.map((entry, index) => {
            const contact = contacts.find((item) => item.id === entry.contactId)
            return (
              <li key={entry.contactId} className="smslist__item">
                <span className="smslist__order" aria-hidden="true">{index + 1}</span>
                <span className="smslist__text">
                  <span className="smslist__name">{contact?.name ?? t('sms.unknownContact')}</span>
                  <span className="smslist__meta">
                    {contact?.number ? `${contact.number} · ` : ''}
                    {t('sms.attempts', { count: entry.attempts })}
                    {entry.status === 'sent' && entry.delayS !== null ? ` · ${t('sms.delay', { seconds: entry.delayS })}` : ''}
                  </span>
                </span>
                <Badge variant={VARIANT[entry.status] ?? 'neutral'}>{t(`sms.status.${entry.status}`, { defaultValue: entry.status })}</Badge>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
