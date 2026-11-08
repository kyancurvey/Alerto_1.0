import { useEffect, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, ScanLine } from 'lucide-react'
import Page from '../../components/layout/Page'
import { Button, Card, CheckList, Field } from '../../components/ui'
import { wait } from '../../lib/latency'
import { can } from '../../lib/permissions'
import { HEALTH_ROWS, healthRows } from '../../lib/unitHealth'
import { normalizePlate } from '../../lib/validate'
import { pathOf } from '../../routes'
import { useStore } from '../../store/StoreProvider'
import useSession from '../../store/useSession'
import { selectUnit } from '../../store/selectors'
import QrScanSheet from '../setup/QrScanSheet'
import useAlive from '../setup/useAlive'
import './vehicles.css'

const TICK_MS = 450

// Add a vehicle: its details, then the pairing code of its unit. The unit is checked as soon as it is linked.
export default function AddVehiclePage() {
  const { t } = useTranslation('vehicles')
  const { state, actions } = useStore()
  const { role } = useSession()
  const alive = useAlive()
  const [step, setStep] = useState('details')
  const [name, setName] = useState('')
  const [plate, setPlate] = useState('')
  const [route, setRoute] = useState('')
  const [code, setCode] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [added, setAdded] = useState(null)
  const [shown, setShown] = useState(0)
  const ran = useRef(false)

  const unit = added ? selectUnit(state, added.unitId) : null

  // Once the unit is linked its check ticks through the rows.
  useEffect(() => {
    if (!added || ran.current) return
    ran.current = true
    ;(async () => {
      for (let count = 1; count <= HEALTH_ROWS.length; count += 1) {
        await wait(TICK_MS)
        if (!alive.current) return
        setShown(count)
      }
    })()
  }, [added, alive])

  if (!can(role, 'addVehicle')) return <Navigate to={pathOf('vehicles')} replace />

  const next = (event) => {
    event.preventDefault()
    const found = {}
    if (name.trim().length < 2) found.name = t('add.errors.nameRequired')
    if (!plate.trim()) found.plate = t('add.errors.plateRequired')
    else if (!normalizePlate(plate)) found.plate = t('add.errors.plateInvalid')
    if (route.trim().length < 2) found.route = t('add.errors.routeRequired')
    setErrors(found)
    if (Object.keys(found).length === 0) setStep('unit')
  }

  const claim = async (event) => {
    event.preventDefault()
    if (!code.trim()) return setErrors({ code: t('add.errors.codeRequired') })
    setErrors({})
    setBusy(true)
    const result = await actions.addVehicle({ name, plate, route, code })
    if (!alive.current) return undefined
    setBusy(false)
    if (!result.ok) {
      if (result.error === 'plateTaken' || result.error === 'plateInvalid') {
        setStep('details')
        return setErrors({ plate: t(`add.errors.${result.error}`) })
      }
      return setErrors({ code: t(`add.errors.${result.error}`, { defaultValue: t('add.errors.failed') }) })
    }
    return setAdded(result)
  }

  const scan = () => setScanOpen(true)
  const rows = unit ? healthRows(unit) : null
  const items = HEALTH_ROWS.map((id, index) => {
    const row = index < shown ? (rows[id].ok ? 'ok' : 'fault') : index === shown ? 'running' : 'pending'
    const detailKey = rows?.[id].ok ? (rows[id].variant ?? 'ok') : 'fault'
    return { id, label: t(`health.${id}.label`), state: row, detail: row === 'ok' || row === 'fault' ? t(`health.${id}.${detailKey}`, rows[id].params) : row === 'running' ? t('add.checking') : undefined }
  })
  const checked = shown >= HEALTH_ROWS.length

  return (
    <Page title={t('add.title')}>
      <Link to={pathOf('vehicles')} className="btn btn--ghost vdetail__back">
        <ArrowLeft size={20} aria-hidden="true" />{t('back')}
      </Link>

      {step === 'details' && (
        <Card>
          <form className="vform" onSubmit={next} noValidate>
            <p className="vsection__meta">{t('add.step', { current: 1, total: 2 })}</p>
            <Field label={t('add.name')} hint={t('add.nameHint')} autoComplete="off" value={name} error={errors.name} onChange={(event) => setName(event.target.value)} />
            <Field label={t('add.plate')} hint={t('add.plateHint')} autoCapitalize="characters" autoComplete="off" spellCheck={false} value={plate} error={errors.plate} onChange={(event) => setPlate(event.target.value.toUpperCase())} />
            <Field label={t('add.route')} hint={t('add.routeHint')} autoComplete="off" value={route} error={errors.route} onChange={(event) => setRoute(event.target.value)} />
            <Button type="submit">{t('add.next')}</Button>
          </form>
        </Card>
      )}

      {step === 'unit' && !added && (
        <Card>
          <form className="vform" onSubmit={claim} noValidate>
            <p className="vsection__meta">{t('add.step', { current: 2, total: 2 })}</p>
            <p>{t('add.unitIntro', { name: name.trim() })}</p>
            <Field
              label={t('add.code')}
              hint={t('add.codeHint')}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              value={code}
              error={errors.code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
            <Button variant="secondary" onClick={scan}><ScanLine size={22} aria-hidden="true" />{t('add.scan')}</Button>
            <div className="vform__buttons">
              <Button type="submit" loading={busy}>{t('add.claim')}</Button>
              <Button variant="ghost" onClick={() => setStep('details')}>{t('add.back')}</Button>
            </div>
          </form>
        </Card>
      )}

      {added && unit && (
        <Card as="section" className="vsection" aria-labelledby="added-title">
          <h2 id="added-title" className="vsection__title">{t('add.added', { name: name.trim() })}</h2>
          <p>{t('add.linked', { id: unit.id })}</p>
          <CheckList items={items} label={t('health.title')} />
          {checked && (
            <>
              <p className="vsection__meta">{t('add.next2')}</p>
              <div className="vform__buttons">
                <Link to={`${pathOf('vehicles')}/${added.vehicleId}`} className="btn btn--primary">{t('add.open')}</Link>
                <Link to={pathOf('people')} className="btn btn--secondary" onClick={() => actions.setActiveVehicle(added.vehicleId)}>{t('add.contacts')}</Link>
              </div>
            </>
          )}
        </Card>
      )}

      <QrScanSheet open={scanOpen} onClose={() => setScanOpen(false)} onResult={(value) => { setCode(value); setScanOpen(false) }} />
    </Page>
  )
}
