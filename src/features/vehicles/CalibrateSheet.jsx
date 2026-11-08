import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, CheckList, Sheet } from '../../components/ui'
import { latency } from '../../lib/latency'
import { useStore } from '../../store/StoreProvider'

const STEPS = ['request', 'measure', 'save']

// The unit measures how it sits in the cab: each step ticks, then the result is saved.
function CalibrateRun({ vehicle, onDone }) {
  const { t } = useTranslation('vehicles')
  const { actions } = useStore()
  const [finished, setFinished] = useState(0)
  const [result, setResult] = useState(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      for (let index = 0; index < 2; index += 1) {
        setFinished(index)
        await latency(500, 900)
        if (cancelled) return
      }
      setFinished(2)
      const outcome = await actions.calibrateUnit(vehicle.id)
      if (cancelled) return
      setResult(outcome)
      setFinished(STEPS.length)
    })()
    return () => {
      cancelled = true
    }
    // The run starts once, when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const complete = finished >= STEPS.length
  const failed = complete && result && !result.ok
  const items = STEPS.map((id, index) => {
    const state = index < finished ? (failed && index === STEPS.length - 1 ? 'fault' : 'ok') : index === finished ? 'running' : 'pending'
    return { id, label: t(`calibration.steps.${id}`), state, detail: state === 'running' ? t('calibration.running') : undefined }
  })

  return (
    <div className="vsheet">
      <CheckList items={items} label={t('calibration.title')} />
      {complete && <p className={failed ? 'vsection__warn' : 'vsection__ok'} role="status">{failed ? t(`calibration.errors.${result.error}`, { defaultValue: t('calibration.errors.failed') }) : t('calibration.done')}</p>}
      <Button block variant={complete ? 'primary' : 'outline'} onClick={onDone}>{complete ? t('calibration.close') : t('calibration.cancel')}</Button>
    </div>
  )
}

export default function CalibrateSheet({ open, vehicle, onClose }) {
  const { t } = useTranslation('vehicles')
  const [started, setStarted] = useState(false)
  useEffect(() => {
    if (!open) setStarted(false)
  }, [open])

  return (
    <Sheet open={open} onClose={onClose} title={t('calibration.title')}>
      {open && !started && (
        <div className="vsheet">
          <p>{t('calibration.intro')}</p>
          <ul className="vsheet__list">
            <li>{t('calibration.prepare1')}</li>
            <li>{t('calibration.prepare2')}</li>
          </ul>
          <Button block onClick={() => setStarted(true)}>{t('calibration.start')}</Button>
        </div>
      )}
      {open && started && <CalibrateRun key={vehicle.id} vehicle={vehicle} onDone={onClose} />}
    </Sheet>
  )
}
