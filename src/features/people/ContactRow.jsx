import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowDown, ArrowUp, MessageSquare, Pencil, Trash2 } from 'lucide-react'
import { Badge, Button, RelativeTime } from '../../components/ui'
import { pathOf } from '../../routes'
import { relationText } from './relation'

function Delivery({ delivery }) {
  const { t } = useTranslation('people')
  if (!delivery) return <span>{t('contacts.noMessage')}</span>
  const kind = delivery.test ? 'test' : delivery.status
  return (
    <span>
      {t(`contacts.delivery.${kind}`)} <RelativeTime value={delivery.at} />
      {delivery.eventId && (
        <>
          {' · '}
          <Link to={`${pathOf('events')}/${delivery.eventId}`} className="pcontact__link">{t('contacts.openEvent')}</Link>
        </>
      )}
    </span>
  )
}

// One emergency contact: its place in the order, consent, the last message, and what the driver can do with it.
export default function ContactRow({ contact, index, count, canTest, onMove, onTest, onEdit, onRemove }) {
  const { t, i18n } = useTranslation(['people', 'setup'])
  const agreed = new Intl.DateTimeFormat(i18n.language === 'fil' ? 'fil-PH' : 'en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium' }).format(contact.consentAt)

  return (
    <li className="pcontact">
      <span className="pcontact__order" role="img" aria-label={t('contacts.position', { position: index + 1 })}>{index + 1}</span>
      <div className="pcontact__main">
        <span className="pcontact__name">{contact.name}</span>
        <span className="pcontact__detail">{relationText(t, contact.relation)} · {contact.number}</span>
        <span className="pcontact__badges">
          <Badge variant="ready">{t('contacts.agreed', { date: agreed })}</Badge>
          {contact.linkedAccountId && <Badge variant="updating">{t('contacts.usesApp')}</Badge>}
        </span>
        <span className="pcontact__detail"><Delivery delivery={contact.lastDelivery} /></span>
      </div>
      <div className="pcontact__actions">
        <Button variant="ghost" className="pcontact__icon" disabled={index === 0} aria-label={t('contacts.moveUp', { name: contact.name })} onClick={() => onMove(contact, 'up')}>
          <ArrowUp size={22} aria-hidden="true" />
        </Button>
        <Button variant="ghost" className="pcontact__icon" disabled={index === count - 1} aria-label={t('contacts.moveDown', { name: contact.name })} onClick={() => onMove(contact, 'down')}>
          <ArrowDown size={22} aria-hidden="true" />
        </Button>
        <Button variant="ghost" disabled={!canTest} aria-label={t('contacts.testFor', { name: contact.name })} onClick={() => onTest(contact)}>
          <MessageSquare size={22} aria-hidden="true" />{t('contacts.test')}
        </Button>
        <Button variant="ghost" aria-label={t('contacts.editFor', { name: contact.name })} onClick={() => onEdit(contact)}>
          <Pencil size={22} aria-hidden="true" />{t('contacts.edit')}
        </Button>
        <Button variant="ghost" aria-label={t('contacts.removeFor', { name: contact.name })} onClick={() => onRemove(contact)}>
          <Trash2 size={22} aria-hidden="true" />{t('contacts.remove')}
        </Button>
      </div>
    </li>
  )
}
