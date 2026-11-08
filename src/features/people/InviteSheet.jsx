import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Field, Select, Sheet, Toggle } from '../../components/ui'
import { inviteLink } from '../../lib/links'
import { RELATIONS } from '../../lib/setup'
import { useStore } from '../../store/StoreProvider'
import CopyButton from './CopyButton'

const SHARES = ['alerts', 'map', 'status']

function InviteForm({ onClose }) {
  const { t } = useTranslation(['people', 'setup'])
  const { actions } = useStore()
  const [name, setName] = useState('')
  const [relation, setRelation] = useState('')
  const [share, setShare] = useState({ alerts: true, map: true, status: true })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState(null)

  const submit = async (event) => {
    event.preventDefault()
    const found = {}
    if (name.trim().length < 2) found.name = t('invite.errors.nameRequired')
    if (!relation) found.relation = t('invite.errors.relationRequired')
    if (!SHARES.some((key) => share[key])) found.share = t('invite.errors.shareRequired')
    setErrors(found)
    if (Object.keys(found).length > 0) return
    setBusy(true)
    const result = await actions.createFamilyInvite({ name, relation, share })
    setBusy(false)
    if (!result.ok) return setErrors({ form: t('invite.errors.failed') })
    return setCode(result.code)
  }

  if (code) {
    return (
      <div className="pform">
        <p>{t('invite.ready', { name: name.trim() })}</p>
        <dl className="pinvite__facts">
          <div>
            <dt>{t('invite.code')}</dt>
            <dd className="pinvite__code">{code}</dd>
          </div>
          <div>
            <dt>{t('invite.link')}</dt>
            <dd className="pinvite__link">{inviteLink(code)}</dd>
          </div>
        </dl>
        <div className="pform__buttons">
          <CopyButton text={inviteLink(code)} label={t('invite.copyLink')} done={t('invite.copiedLink')} />
          <CopyButton text={code} label={t('invite.copyCode')} done={t('invite.copiedCode')} />
        </div>
        <p className="pform__note">{t('invite.note', { name: name.trim() })}</p>
        <Button block onClick={onClose}>{t('invite.done')}</Button>
      </div>
    )
  }

  return (
    <form className="pform" onSubmit={submit} noValidate>
      <p>{t('invite.intro')}</p>
      <Field label={t('invite.name')} autoComplete="off" value={name} error={errors.name} onChange={(event) => setName(event.target.value)} />
      <Select
        label={t('invite.relation')}
        value={relation}
        onChange={(event) => setRelation(event.target.value)}
        options={[{ value: '', label: t('form.relationChoose') }, ...RELATIONS.map((key) => ({ value: key, label: t(`setup:relations.${key}`) }))]}
      />
      {errors.relation && <p className="field__error">{errors.relation}</p>}
      <fieldset className="pform__fieldset">
        <legend className="pform__legend">{t('invite.shareTitle')}</legend>
        {SHARES.map((key) => (
          <Toggle key={key} label={t(`share.${key}`)} hint={t(`share.${key}Hint`)} checked={share[key]} onChange={(value) => setShare((previous) => ({ ...previous, [key]: value }))} />
        ))}
        {errors.share && <p className="field__error">{errors.share}</p>}
      </fieldset>
      {errors.form && <p className="field__error">{errors.form}</p>}
      <Button type="submit" block loading={busy}>{t('invite.create')}</Button>
    </form>
  )
}

export default function InviteSheet({ open, onClose }) {
  const { t } = useTranslation('people')
  return (
    <Sheet open={open} onClose={onClose} title={t('invite.title')}>
      {open && <InviteForm onClose={onClose} />}
    </Sheet>
  )
}
