import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import { Avatar, Badge, Button, Field, Select, Toggle } from '../../../components/ui'
import useTypeFill from '../../../components/presenter/useTypeFill'
import { wait } from '../../../lib/latency'
import { RELATIONS } from '../../../lib/setup'
import { normalizePhone } from '../../../lib/validate'
import { fills } from '../../../sim/fills'
import { useStore } from '../../../store/StoreProvider'
import StepNav from '../StepNav'
import useAlive from '../useAlive'

export default function ContactsStep({ draft, go, fillRef }) {
  const { t } = useTranslation('setup')
  const { actions } = useStore()
  const alive = useAlive()
  const typeFill = useTypeFill()
  const [name, setName] = useState('')
  const [relation, setRelation] = useState('')
  const [number, setNumber] = useState('')
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const { contacts } = draft

  // Returns true when the contact was added.
  const add = async (values) => {
    const found = {}
    if (values.name.trim().length < 2) found.name = t('contacts.errors.nameRequired')
    if (!values.relation) found.relation = t('contacts.errors.relationRequired')
    if (!values.number.trim()) found.number = t('contacts.errors.numberRequired')
    else if (!normalizePhone(values.number)) found.number = t('contacts.errors.numberInvalid')
    if (!values.consent) found.consent = t('contacts.errors.consentRequired')
    setErrors(found)
    if (Object.keys(found).length > 0) return false
    setBusy(true)
    const result = await actions.addSetupContact(values)
    if (!alive.current) return false
    setBusy(false)
    if (!result.ok) {
      setErrors({ number: t(`contacts.errors.${result.error}`) })
      return false
    }
    setName('')
    setRelation('')
    setNumber('')
    setConsent(false)
    return true
  }

  const fill = async () => {
    if (contacts.length > 0) {
      go('invite')
      return
    }
    setErrors({})
    const values = fills.newContact
    if (!(await typeFill([[setName, values.name], () => setRelation(values.relation), [setNumber, values.number], () => setConsent(true)]))) return
    await wait(500)
    if (!alive.current) return
    if (await add({ ...values, consent: true })) {
      await wait(500)
      if (alive.current) go('invite')
    }
  }
  useEffect(() => {
    fillRef.current = fill
    return () => {
      fillRef.current = null
    }
  })

  return (
    <div className="setup__form">
      <p>{t('contacts.intro')}</p>

      {contacts.length > 0 && (
        <section className="setup__section">
          <h3 className="setup__section-title">{t('contacts.listTitle')}</h3>
          <ul className="setup__list">
            {contacts.map((contact) => (
              <li key={contact.id} className="setup__row">
                <Avatar name={contact.name} size="md" />
                <div className="setup__row-text">
                  <span className="setup__row-title">{contact.name}</span>
                  <span className="setup__row-detail">{t(`relations.${contact.relation}`, { defaultValue: contact.relation })} · {contact.number}</span>
                  <Badge variant="ready">{t('contacts.agreed')}</Badge>
                </div>
                <Button variant="ghost" className="setup__iconbtn" aria-label={t('contacts.remove', { name: contact.name })} onClick={() => actions.removeSetupContact(contact.id)}>
                  <Trash2 size={22} aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <form
        className="setup__form"
        onSubmit={(event) => {
          event.preventDefault()
          add({ name, relation, number, consent })
        }}
        noValidate
      >
        <h3 className="setup__section-title">{contacts.length > 0 ? t('contacts.addAnotherTitle') : t('contacts.addTitle')}</h3>
        <Field label={t('contacts.name')} autoComplete="off" value={name} error={errors.name} onChange={(event) => setName(event.target.value)} />
        <Select
          label={t('contacts.relation')}
          value={relation}
          onChange={(event) => setRelation(event.target.value)}
          options={[{ value: '', label: t('contacts.relationChoose') }, ...RELATIONS.map((key) => ({ value: key, label: t(`relations.${key}`) }))]}
        />
        {errors.relation && <p className="field__error">{errors.relation}</p>}
        <Field
          label={t('contacts.number')}
          hint={t('contacts.numberHint')}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          value={number}
          error={errors.number}
          onChange={(event) => setNumber(event.target.value)}
        />
        <div>
          <Toggle label={t('contacts.consent')} hint={t('contacts.consentHint')} checked={consent} onChange={setConsent} />
          {errors.consent && <p className="field__error">{errors.consent}</p>}
        </div>
        <Button type="submit" variant="secondary" block loading={busy}>{t('contacts.add')}</Button>
      </form>

      {contacts.length === 0 && <p className="setup__hint">{t('contacts.needOne')}</p>}
      <StepNav onBack={() => go('unit')} onNext={() => go('invite')} nextDisabled={contacts.length === 0} />
    </div>
  )
}
