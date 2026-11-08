import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, UserRound } from 'lucide-react'
import { Button, Card, EmptyState, Sheet, useToast } from '../../components/ui'
import { useStore } from '../../store/StoreProvider'
import { selectAlertsOf, selectContacts, selectUnitOfVehicle } from '../../store/selectors'
import TestSheet from '../home/TestSheet'
import ContactRow from './ContactRow'
import ContactSheet from './ContactSheet'

// The emergency contacts of one vehicle, in the order the crash messages go out.
export default function ContactsSection({ vehicle }) {
  const { t } = useTranslation('people')
  const toast = useToast()
  const { state, actions } = useStore()
  const contacts = selectContacts(state, vehicle.id)
  const unit = selectUnitOfVehicle(state, vehicle.id)
  const alerting = selectAlertsOf(state, [vehicle.id]).length > 0
  const canTest = unit.status.presence === 'online' && !alerting
  const [form, setForm] = useState(null)
  const [testing, setTesting] = useState(null)
  const [removing, setRemoving] = useState(null)
  const [busy, setBusy] = useState(false)
  const [removeError, setRemoveError] = useState('')

  const move = (contact, direction) => {
    const result = actions.moveContact(contact.id, direction)
    if (result.ok) toast.show(t('contacts.moved', { name: contact.name, position: contacts.findIndex((item) => item.id === contact.id) + (direction === 'up' ? 0 : 2) }), 'success')
  }

  const remove = async () => {
    setBusy(true)
    setRemoveError('')
    const result = await actions.removeContact(removing.id)
    setBusy(false)
    if (!result.ok) return setRemoveError(t(`contacts.removeErrors.${result.error}`, { defaultValue: t('contacts.removeErrors.failed') }))
    toast.show(t('contacts.removed', { name: removing.name }), 'success')
    return setRemoving(null)
  }

  return (
    <Card as="section" className="psection" aria-labelledby={`contacts-${vehicle.id}`}>
      <h2 id={`contacts-${vehicle.id}`} className="psection__title">{t('contacts.title')}</h2>
      <p className="psection__intro">{t('contacts.intro')}</p>

      {contacts.length === 0 ? (
        <EmptyState icon={UserRound} title={t('contacts.emptyTitle')} description={t('contacts.emptyDetail')} />
      ) : (
        <ol className="pcontacts">
          {contacts.map((contact, index) => (
            <ContactRow
              key={contact.id}
              contact={contact}
              index={index}
              count={contacts.length}
              canTest={canTest}
              onMove={move}
              onTest={(item) => setTesting(item.id)}
              onEdit={(item) => setForm({ contact: item })}
              onRemove={(item) => { setRemoveError(''); setRemoving(item) }}
            />
          ))}
        </ol>
      )}
      {contacts.length > 0 && !canTest && <p className="psection__hint">{unit.status.presence === 'online' ? t('contacts.needClear') : t('contacts.needOnline')}</p>}

      <Button variant="secondary" onClick={() => setForm({ contact: null })}>
        <Plus size={22} aria-hidden="true" />{t('contacts.add')}
      </Button>

      <ContactSheet
        open={Boolean(form)}
        vehicle={vehicle}
        contact={form?.contact ?? null}
        onClose={() => setForm(null)}
        onSaved={(kind) => {
          setForm(null)
          toast.show(t(`form.${kind}`), 'success')
        }}
      />
      <TestSheet kind={testing ? 'sms' : null} vehicle={vehicle} contactId={testing} onClose={() => setTesting(null)} />
      <Sheet open={Boolean(removing)} onClose={() => setRemoving(null)} title={t('contacts.removeTitle')}>
        {removing && (
          <div className="pform">
            <p>{t('contacts.removeText', { name: removing.name })}</p>
            {removeError && <p className="field__error" role="alert">{removeError}</p>}
            <Button variant="danger" block loading={busy} onClick={remove}>{t('contacts.removeConfirm', { name: removing.name })}</Button>
            <Button variant="outline" block onClick={() => setRemoving(null)}>{t('contacts.keep')}</Button>
          </div>
        )}
      </Sheet>
    </Card>
  )
}
