import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, Field, RelativeTime, Select, Toggle, useToast } from '../../components/ui'
import { COUNTDOWN_MAX_S, COUNTDOWN_MIN_S, HOLD_DELAYS_MIN, SENSITIVITIES, SETTING_KEYS, UNIT_LANGUAGES, VOLUMES, invalidSettings, pickSettings } from '../../lib/unitSettings'
import { useStore } from '../../store/StoreProvider'
import { selectSettingsStatus, unitReachable } from '../../store/selectors'

const toForm = (content) => ({
  countdownS: String(content.countdownS),
  volume: content.volume,
  language: content.language,
  sensitivity: content.sensitivity,
  positionReports: content.positionReports,
  holdDelayMin: String(content.holdDelayMin),
})
const toValues = (form) => ({ ...form, countdownS: Number(form.countdownS), holdDelayMin: Number(form.holdDelayMin) })

// The unit's settings. Saving makes a new version that waits for the unit ("pending") and is then applied.
export default function SettingsCard({ vehicle, unit }) {
  const { t } = useTranslation('vehicles')
  const toast = useToast()
  const { state, actions } = useStore()
  const { applied, pending } = selectSettingsStatus(state, unit.id)
  const current = pending ?? applied
  const [form, setForm] = useState(() => toForm(current.content))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const waitingFor = useRef(null)

  const values = toValues(form)
  const saved = pickSettings(current.content)
  const dirty = SETTING_KEYS.some((key) => values[key] !== saved[key])
  const set = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }))

  // Tells the driver when the change they saved has reached the unit.
  const appliedVersion = applied?.version ?? 0
  useEffect(() => {
    if (waitingFor.current !== null && !pending && appliedVersion >= waitingFor.current) {
      toast.show(t('settings.appliedToast', { version: appliedVersion }), 'success')
      waitingFor.current = null
    }
  }, [pending, appliedVersion, toast, t])

  const submit = async (event) => {
    event.preventDefault()
    if (invalidSettings(values).includes('countdownS')) {
      setError(t('settings.errors.countdownRange', { min: COUNTDOWN_MIN_S, max: COUNTDOWN_MAX_S }))
      return
    }
    setError('')
    setBusy(true)
    const result = await actions.changeUnitSettings(vehicle.id, values)
    setBusy(false)
    if (!result.ok) {
      setError(t('settings.errors.failed'))
      return
    }
    if (!result.unchanged) {
      waitingFor.current = result.version
      toast.show(t('settings.sentToast', { version: result.version }), 'success')
    }
  }

  return (
    <Card as="section" className="vsection" aria-labelledby={`settings-${vehicle.id}`}>
      <h2 id={`settings-${vehicle.id}`} className="vsection__title">{t('settings.title')}</h2>

      <div className="vsettings__status" role="status" aria-live="polite">
        {pending && (
          <p className="vsettings__line">
            <Badge variant="updating">{t('settings.pending', { version: pending.version })}</Badge>
            <span>{unitReachable(unit) ? t('settings.waiting') : t('settings.waitingOffline')}</span>
          </p>
        )}
        {applied && (
          <p className="vsettings__line">
            <Badge variant="ready">{t('settings.applied', { version: applied.version })}</Badge>
            <span>{t('settings.appliedAt')} <RelativeTime value={applied.appliedAt} /></span>
          </p>
        )}
      </div>

      <form className="vform" onSubmit={submit} noValidate>
        <Field
          label={t('settings.countdown')}
          hint={t('settings.countdownHint', { min: COUNTDOWN_MIN_S, max: COUNTDOWN_MAX_S })}
          type="number"
          inputMode="numeric"
          min={COUNTDOWN_MIN_S}
          max={COUNTDOWN_MAX_S}
          step="1"
          value={form.countdownS}
          error={error && invalidSettings(values).includes('countdownS') ? error : undefined}
          onChange={set('countdownS')}
        />
        <Select label={t('settings.volume')} value={form.volume} onChange={set('volume')} options={VOLUMES.map((key) => ({ value: key, label: t(`settings.volumes.${key}`) }))} />
        <Select
          label={t('settings.language')}
          hint={t('settings.languageHint')}
          value={form.language}
          onChange={set('language')}
          options={UNIT_LANGUAGES.map((key) => ({ value: key, label: t(`settings.languages.${key}`) }))}
        />
        <Select
          label={t('settings.sensitivity')}
          hint={t('settings.sensitivityHint')}
          value={form.sensitivity}
          onChange={set('sensitivity')}
          options={SENSITIVITIES.map((key) => ({ value: key, label: t(`settings.sensitivities.${key}`) }))}
        />
        <Select
          label={t('settings.holdDelay')}
          hint={t('settings.holdDelayHint')}
          value={form.holdDelayMin}
          onChange={set('holdDelayMin')}
          options={HOLD_DELAYS_MIN.map((minutes) => ({ value: String(minutes), label: t('settings.minutes', { count: minutes }) }))}
        />
        <Toggle
          label={t('settings.position')}
          hint={t('settings.positionHint')}
          checked={form.positionReports}
          onChange={(value) => setForm((previous) => ({ ...previous, positionReports: value }))}
        />
        {error && !invalidSettings(values).includes('countdownS') && <p className="field__error">{error}</p>}
        <div className="vform__buttons">
          <Button type="submit" loading={busy} disabled={!dirty}>{t('settings.save')}</Button>
          {dirty && !busy && <Button variant="ghost" onClick={() => { setForm(toForm(current.content)); setError('') }}>{t('settings.undo')}</Button>}
        </div>
      </form>
    </Card>
  )
}
