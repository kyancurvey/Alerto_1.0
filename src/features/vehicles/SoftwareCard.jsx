import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, useToast } from '../../components/ui'
import { updateStageAt } from '../../lib/unitSettings'
import useNow from '../../lib/useNow'
import { useStore } from '../../store/StoreProvider'
import { selectUpdate, unitReachable } from '../../store/selectors'

// Why a driver cannot start the update right now. Null when it can start.
function blockerOf(unit, alerting) {
  if (!unitReachable(unit)) return 'unitOffline'
  if (unit.status.ignition) return 'ignitionOn'
  if (alerting) return 'alertActive'
  return null
}

// Software version and the update. The update runs on the unit while it is parked; progress follows the clock, so it carries on if the screen is left.
export default function SoftwareCard({ vehicle, unit, alerting, canUpdate }) {
  const { t } = useTranslation('vehicles')
  const toast = useToast()
  const { state, actions } = useStore()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const updating = Boolean(unit.update)
  const now = useNow(500, updating)
  const update = selectUpdate(state, unit, now)
  const blocker = blockerOf(unit, alerting)

  // Tells the driver when an update that was running has finished.
  const was = useRef(update.phase)
  useEffect(() => {
    if (was.current === 'updating' && update.phase === 'upToDate') toast.show(t('software.doneToast', { version: unit.firmware }), 'success')
    was.current = update.phase
  }, [update.phase, unit.firmware, toast, t])

  const start = async () => {
    setError('')
    setBusy(true)
    const result = await actions.startUnitUpdate(vehicle.id)
    setBusy(false)
    if (!result.ok) setError(t(`software.errors.${result.error}`, { defaultValue: t('software.errors.failed') }))
  }

  return (
    <Card as="section" className="vsection" aria-labelledby={`software-${vehicle.id}`}>
      <h2 id={`software-${vehicle.id}`} className="vsection__title">{t('software.title')}</h2>
      <p className="vsection__row">
        {update.phase === 'upToDate' && <Badge variant="ready">{t('software.upToDate')}</Badge>}
        {update.phase === 'available' && <Badge variant="updating">{t('software.available')}</Badge>}
        {update.phase === 'updating' && <Badge variant="updating">{t('software.updating')}</Badge>}
        <span>{t('software.version', { version: unit.firmware })}</span>
      </p>

      {update.phase === 'available' && <p className="vsection__meta">{t('software.newer', { current: unit.firmware, latest: update.to })}</p>}

      {update.phase === 'updating' && (
        <div className="vprogress" role="status" aria-live="polite">
          <div className="vprogress__bar" role="progressbar" aria-label={t('software.progress')} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(update.progress * 100)}>
            <span className="vprogress__fill" style={{ width: `${Math.round(update.progress * 100)}%` }} />
          </div>
          <p className="vsection__meta">{t(`software.stages.${updateStageAt(update.progress)}`, { latest: update.to })} · {Math.round(update.progress * 100)}%</p>
        </div>
      )}

      {canUpdate && update.phase === 'available' && (
        <>
          <Button variant="secondary" loading={busy} disabled={Boolean(blocker)} onClick={start}>{t('software.update', { latest: update.to })}</Button>
          {blocker && <p className="vsection__meta">{t(`software.blocked.${blocker}`)}</p>}
        </>
      )}
      {error && <p className="field__error">{error}</p>}
    </Card>
  )
}
