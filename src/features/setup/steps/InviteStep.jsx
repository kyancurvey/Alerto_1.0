import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy } from 'lucide-react'
import { Button, Field, Select, Toggle, useToast } from '../../../components/ui'
import useTypeFill from '../../../components/presenter/useTypeFill'
import { inviteLink } from '../../../lib/links'
import { wait } from '../../../lib/latency'
import { RELATIONS } from '../../../lib/setup'
import { fills } from '../../../sim/fills'
import { useStore } from '../../../store/StoreProvider'
import StepNav from '../StepNav'
import useAlive from '../useAlive'

const SHARES = ['alerts', 'map', 'status']

export default function InviteStep({ draft, go, fillRef }) {
  const { t } = useTranslation('setup')
  const toast = useToast()
  const { actions } = useStore()
  const alive = useAlive()
  const typeFill = useTypeFill()
  const [name, setName] = useState('')
  const [relation, setRelation] = useState('')
  const [localShare, setLocalShare] = useState({ alerts: true, map: true, status: true })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const { invite } = draft
  // Before the invitation exists the choices are kept here; afterwards they change the invitation itself.
  const share = invite ? invite.share : localShare
  const setShare = (key, value) => {
    const next = { ...share, [key]: value }
    if (invite) actions.setSetupShare(next)
    else setLocalShare(next)
  }

  // Returns true when the invitation was created.
  const create = async (values) => {
    const found = {}
    if (values.name.trim().length < 2) found.name = t('invite.errors.nameRequired')
    if (!values.relation) found.relation = t('invite.errors.relationRequired')
    if (!SHARES.some((key) => values.share[key])) found.share = t('invite.errors.shareRequired')
    setErrors(found)
    if (Object.keys(found).length > 0) return false
    setBusy(true)
    const result = await actions.createSetupInvite(values)
    if (!alive.current) return false
    setBusy(false)
    return result.ok
  }

  const fill = async () => {
    if (invite) {
      go('tests')
      return
    }
    setErrors({})
    const values = fills.newInvite
    if (!(await typeFill([[setName, values.name], () => setRelation(values.relation)]))) return
    await wait(500)
    if (!alive.current) return
    if (await create({ ...values, share })) {
      await wait(900)
      if (alive.current) go('tests')
    }
  }
  useEffect(() => {
    fillRef.current = fill
    return () => {
      fillRef.current = null
    }
  })

  const link = invite ? inviteLink(invite.code) : ''
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      toast.show(t('invite.copied'), 'success')
    } catch {
      toast.show(t('invite.copyFailed'), 'error')
    }
  }

  const toggles = (
    <fieldset className="setup__fieldset">
      <legend className="setup__section-title">{t('invite.shareTitle')}</legend>
      {SHARES.map((key) => (
        <Toggle key={key} label={t(`invite.${key}`)} hint={t(`invite.${key}Hint`)} checked={share[key]} onChange={(value) => setShare(key, value)} />
      ))}
      {errors.share && <p className="field__error">{errors.share}</p>}
    </fieldset>
  )

  return (
    <div className="setup__form">
      {invite ? (
        <>
          <section className="setup__section">
            <h3 className="setup__section-title">{t('invite.ready', { name: invite.name })}</h3>
            <dl className="setup__facts">
              <div>
                <dt>{t('invite.code')}</dt>
                <dd className="setup__code">{invite.code}</dd>
              </div>
              <div>
                <dt>{t('invite.link')}</dt>
                <dd className="setup__link">{link}</dd>
              </div>
            </dl>
            <Button variant="secondary" block onClick={copy}>
              <Copy size={22} aria-hidden="true" />
              {t('invite.copyLink')}
            </Button>
            <p className="setup__hint">{t('invite.shareNote', { name: invite.name })}</p>
          </section>
          {toggles}
          <StepNav onBack={() => go('contacts')} onNext={() => go('tests')} />
        </>
      ) : (
        <>
          <p>{t('invite.intro')}</p>
          <form
            className="setup__form"
            onSubmit={(event) => {
              event.preventDefault()
              create({ name, relation, share })
            }}
            noValidate
          >
            <Field label={t('invite.name')} autoComplete="off" value={name} error={errors.name} onChange={(event) => setName(event.target.value)} />
            <Select
              label={t('invite.relation')}
              value={relation}
              onChange={(event) => setRelation(event.target.value)}
              options={[{ value: '', label: t('contacts.relationChoose') }, ...RELATIONS.map((key) => ({ value: key, label: t(`relations.${key}`) }))]}
            />
            {errors.relation && <p className="field__error">{errors.relation}</p>}
            {toggles}
            <Button type="submit" block loading={busy}>{t('invite.create')}</Button>
          </form>
          <StepNav onBack={() => go('contacts')} onNext={() => go('tests')} nextLabel={t('invite.skip')} nextVariant="outline" />
        </>
      )}
    </div>
  )
}
