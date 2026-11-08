import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, RelativeTime } from '../../components/ui'
import CalibrateSheet from './CalibrateSheet'

// Mount calibration: how the unit sits in the cab. Needs the unit online and no alert running.
export default function CalibrationCard({ vehicle, unit, alerting }) {
  const { t } = useTranslation('vehicles')
  const [open, setOpen] = useState(false)
  const done = unit.calibration?.state === 'calibrated'
  const online = unit.status.presence === 'online'
  const blocked = !online || alerting

  return (
    <Card as="section" className="vsection" aria-labelledby={`calibration-${vehicle.id}`}>
      <h2 id={`calibration-${vehicle.id}`} className="vsection__title">{t('calibration.title')}</h2>
      <p className="vsection__row">
        {done ? <Badge variant="ready">{t('calibration.done')}</Badge> : <Badge variant="caution">{t('calibration.needed')}</Badge>}
        {done && <span>{t('calibration.at')} <RelativeTime value={unit.calibration.at} /></span>}
      </p>
      <p className="vsection__meta">{t('calibration.detail')}</p>
      <Button variant="secondary" disabled={blocked} onClick={() => setOpen(true)}>{done ? t('calibration.again') : t('calibration.start')}</Button>
      {blocked && <p className="vsection__meta">{online ? t('calibration.needClear') : t('calibration.needOnline')}</p>}
      <CalibrateSheet open={open} vehicle={vehicle} onClose={() => setOpen(false)} />
    </Card>
  )
}
