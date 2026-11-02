import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CircleCheck, ScanLine } from 'lucide-react'
import { Button, Field } from '../../../components/ui'
import { wait } from '../../../lib/latency'
import { useStore } from '../../../store/StoreProvider'
import { selectUnit } from '../../../store/selectors'
import CheckList from '../CheckList'
import QrScanSheet from '../QrScanSheet'
import StepNav from '../StepNav'
import useAlive from '../useAlive'

const ROWS = ['connection', 'gps', 'sensors', 'camera', 'battery', 'firmware']
const TICK_MS = 450

// What the unit reports about itself once it is linked.
function healthOf(unit, latestFirmware) {
  const { status, health } = unit
  return {
    connection: { ok: status.presence === 'online' && health.modem === 'ok', params: { signal: status.signal } },
    gps: { ok: status.gps === 'good' },
    sensors: { ok: health.sensors === 'ok' },
    camera: { ok: health.camera === 'ok' },
    battery: { ok: status.battery >= 20, params: { battery: status.battery } },
    firmware: { ok: unit.firmware === latestFirmware, params: { firmware: unit.firmware } },
  }
}

export default function UnitStep({ draft, go, fillRef }) {
  const { t } = useTranslation('setup')
  const { state, actions } = useStore()
  const alive = useAlive()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const scanDone = useRef(null)
  const unit = draft.unit ? selectUnit(state, draft.unit.id) : null
  // A unit that was already claimed (a reload, or coming back to this step) shows its check as finished.
  const [shown, setShown] = useState(draft.unit ? ROWS.length : 0)
  const checking = Boolean(unit) && shown < ROWS.length

  useEffect(() => () => scanDone.current?.(null), [])

  // Opens the viewfinder and resolves with the code it reads, or null when it is closed.
  const scan = () => new Promise((resolve) => {
    scanDone.current = resolve
    setScanOpen(true)
  })
  const closeScan = (value) => {
    setScanOpen(false)
    scanDone.current?.(value)
    scanDone.current = null
  }
  const scanByHand = async () => {
    setError('')
    const found = await scan()
    if (found) setCode(found)
  }

  const runChecks = async () => {
    for (let count = 1; count <= ROWS.length; count += 1) {
      await wait(TICK_MS)
      if (!alive.current) return false
      setShown(count)
    }
    return true
  }

  const claim = async (value) => {
    if (!value.trim()) {
      setError(t('unit.errors.codeRequired'))
      return false
    }
    setError('')
    setBusy(true)
    const result = await actions.claimSetupUnit(value)
    if (!alive.current) return false
    setBusy(false)
    if (!result.ok) {
      setError(t(`unit.errors.${result.error}`))
      return false
    }
    setShown(0)
    return runChecks()
  }

  const fill = async () => {
    if (unit) {
      if (!checking) go('contacts')
      return
    }
    const found = await scan()
    if (!found || !alive.current) return
    setCode(found)
    await wait(400)
    if (!alive.current) return
    if (await claim(found)) {
      await wait(600)
      if (alive.current) go('contacts')
    }
  }
  useEffect(() => {
    fillRef.current = fill
    return () => {
      fillRef.current = null
    }
  })

  const results = unit ? healthOf(unit, state.meta?.latestFirmware) : null
  const items = ROWS.map((id, index) => {
    const row = index < shown ? (results[id].ok ? 'ok' : 'fault') : index === shown ? 'running' : 'pending'
    const detail = row === 'ok' || row === 'fault' ? t(`unit.health.${id}.${row}`, results[id].params) : row === 'running' ? t('unit.health.running') : undefined
    return { id, label: t(`unit.health.${id}.label`), state: row, detail }
  })
  const allOk = results && ROWS.every((id) => results[id].ok)

  return (
    <div className="setup__form">
      {unit ? (
        <p className="setup__note">
          <CircleCheck size={24} aria-hidden="true" />
          <span>{t('unit.claimed', { id: unit.id, vehicle: draft.vehicle?.name })}</span>
        </p>
      ) : (
        <form
          className="setup__form"
          onSubmit={(event) => {
            event.preventDefault()
            claim(code)
          }}
          noValidate
        >
          <Field
            label={t('unit.code')}
            hint={t('unit.codeHint')}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            value={code}
            error={error}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
          />
          <Button variant="secondary" block onClick={scanByHand}>
            <ScanLine size={22} aria-hidden="true" />
            {t('unit.scan')}
          </Button>
          <Button type="submit" block loading={busy}>{t('unit.claim')}</Button>
        </form>
      )}

      {unit && (
        <section className="setup__section">
          <h3 className="setup__section-title">{t('unit.health.title')}</h3>
          <CheckList items={items} label={t('unit.health.title')} />
          {!checking && <p className="setup__status" role="status">{allOk ? t('unit.health.done') : t('unit.health.attention')}</p>}
        </section>
      )}

      <StepNav onBack={() => go('vehicle')} onNext={() => go('contacts')} nextDisabled={!unit || checking} />
      <QrScanSheet open={scanOpen} onClose={() => closeScan(null)} onResult={closeScan} />
    </div>
  )
}
