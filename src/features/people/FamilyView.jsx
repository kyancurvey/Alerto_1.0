import { useTranslation } from 'react-i18next'
import { Phone, Users } from 'lucide-react'
import { Avatar, Badge, Card, EmptyState } from '../../components/ui'
import { telHref } from '../../lib/validate'
import { useStore } from '../../store/StoreProvider'
import { selectContacts } from '../../store/selectors'
import { relationText } from './relation'

const SHARES = ['alerts', 'map', 'status']

// What a family member sees of Contacts and Family: each linked driver's contacts in order, with a call button. Nothing can be changed.
export default function FamilyView({ subjects }) {
  const { t } = useTranslation(['people', 'setup'])
  const { state } = useStore()

  if (subjects.length === 0) return <EmptyState icon={Users} title={t('view.emptyTitle')} description={t('view.emptyDetail')} />

  return subjects.map((subject) => {
    const lists = subject.vehicles.map((vehicle) => ({ vehicle, contacts: selectContacts(state, vehicle.id) })).filter((item) => item.contacts.length > 0)
    return (
      <Card as="section" key={subject.id} className="psection" aria-label={subject.name}>
        <header className="pview__who">
          <Avatar name={subject.name} />
          <div>
            <h2 className="psection__title">{subject.name}</h2>
            <p className="pmember__detail">{t('view.driver')}</p>
          </div>
        </header>
        <p className="psection__intro">{t('view.intro', { name: subject.name })}</p>
        <p className="pcontact__badges">
          {SHARES.filter((key) => subject.share[key]).map((key) => <Badge key={key} variant="ready">{t(`share.${key}`)}</Badge>)}
          {SHARES.every((key) => !subject.share[key]) && <Badge>{t('view.sharesNothing')}</Badge>}
        </p>

        {lists.length === 0 && <p className="psection__intro">{t('view.noContacts', { name: subject.name })}</p>}
        {lists.map(({ vehicle, contacts }) => (
          <div key={vehicle.id} className="pview__vehicle">
            {subject.vehicles.length > 1 && <h3 className="pview__vehicle-name">{vehicle.name}</h3>}
            <ol className="pcontacts">
              {contacts.map((contact, index) => (
                <li key={contact.id} className="pcontact">
                  <span className="pcontact__order" role="img" aria-label={t('contacts.position', { position: index + 1 })}>{index + 1}</span>
                  <div className="pcontact__main">
                    <span className="pcontact__name">{contact.name}</span>
                    <span className="pcontact__detail">{relationText(t, contact.relation)} · {contact.number}</span>
                  </div>
                  <a href={telHref(contact.number)} className="btn btn--secondary" aria-label={t('view.callFor', { name: contact.name })}>
                    <Phone size={22} aria-hidden="true" />{t('view.call')}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </Card>
    )
  })
}
