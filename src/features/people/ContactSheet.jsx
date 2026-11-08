import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Field, Select, Sheet, Toggle } from '../../components/ui'
import { RELATIONS } from '../../lib/setup'
import { normalizePhone } from '../../lib/validate'
import { relationText } from './relation'
import { useStore } from '../../store/StoreProvider'

// Which field an error from the store belongs to.
const FIELD_OF = { nameRequired: 'name', relationRequired: 'relation', numberInvalid: 'number', numberTaken: 'number', consentRequired: 'consent' }

function ContactForm({ vehicle, contact, onDone }) {
  const { t, i18n } = useTranslation(['people', 'setup'])
  const { actions } = useStore()
  const [name, setName] = useState(contact?.name ?? '')
  const [relation, setRelation] = useState(contact?.relation ?? '')
  const [number, setNumber] = useState(contact?.number ?? '')
  const [consent, setConsent] = useState(Boolean(contact))
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  // A contact keeps the relationship it already has, even when it is not one of the usual ones.
  const relations = contact && !RELATIONS.includes(contact.relation) ? [...RELATIONS, contact.relation] : RELATIONS
  const numberChanged = contact ? normalizePhone(number) !== contact.number : true

  // A different number is a different person, so their agreement is asked for again.
  const changeNumber = (event) => {
    const value = event.target.value
    setNumber(value)
    if (contact && normalizePhone(value) !== contact.number) setConsent(false)
    else if (contact) setConsent(true)
  }

  const submit = async (event) => {
    event.preventDefault()
    const found = {}
    if (name.trim().length < 2) found.name = t('form.errors.nameRequired')
    if (!relation) found.relation = t('form.errors.relationRequired')
    if (!number.trim()) found.number = t('form.errors.numberRequired')
    else if (!normalizePhone(number)) found.number = t('form.errors.numberInvalid')
    if (numberChanged && !consent) found.consent = t('form.errors.consentRequired')
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setBusy(true)
    const values = { name, relation, number, consent }
    const result = contact ? await actions.updateContact(contact.id, values) : await actions.addContact(vehicle.id, values)
    setBusy(false)
    if (!result.ok) {
      const field = FIELD_OF[result.error]
      setErrors({ [field ?? 'form']: t(`form.errors.${field ? result.error : 'failed'}`) })
      return
    }
    onDone(contact ? 'updated' : 'added')
  }

  return (
    <form className="pform" onSubmit={submit} noValidate>
      <Field label={t('form.name')} autoComplete="off" value={name} error={errors.name} onChange={(event) => setName(event.target.value)} />
      <Select
        label={t('form.relation')}
        value={relation}
        onChange={(event) => setRelation(event.target.value)}
        options={[{ value: '', label: t('form.relationChoose') }, ...relations.map((key) => ({ value: key, label: relationText(t, key) }))]}
      />
      {errors.relation && <p className="field__error">{errors.relation}</p>}
      <Field label={t('form.number')} hint={t('form.numberHint')} type="tel" inputMode="tel" autoComplete="off" value={number} error={errors.number} onChange={changeNumber} />
      {numberChanged ? (
        <div>
          <Toggle label={t('form.consent')} hint={t('form.consentHint')} checked={consent} onChange={setConsent} />
          {errors.consent && <p className="field__error">{errors.consent}</p>}
        </div>
      ) : (
        <p className="pform__note">{t('form.agreedOn', { date: new Intl.DateTimeFormat(i18n.language === 'fil' ? 'fil-PH' : 'en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium' }).format(contact.consentAt) })}</p>
      )}
      {errors.form && <p className="field__error">{errors.form}</p>}
      <Button type="submit" block loading={busy}>{contact ? t('form.save') : t('form.add')}</Button>
    </form>
  )
}

// Add a contact, or edit one. The form starts fresh each time the sheet opens.
export default function ContactSheet({ open, vehicle, contact, onClose, onSaved }) {
  const { t } = useTranslation('people')
  return (
    <Sheet open={open} onClose={onClose} title={contact ? t('form.editTitle') : t('form.addTitle')}>
      {open && <ContactForm key={contact?.id ?? 'new'} vehicle={vehicle} contact={contact} onDone={onSaved} />}
    </Sheet>
  )
}
