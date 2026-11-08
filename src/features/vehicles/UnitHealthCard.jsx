import { useTranslation } from 'react-i18next'
import { Card, CheckList, RelativeTime } from '../../components/ui'
import { HEALTH_ROWS, healthRows } from '../../lib/unitHealth'

// What the unit reports: sensors, camera, modem, battery and GPS. For a unit that is not reporting, the last known values.
export default function UnitHealthCard({ vehicle, unit }) {
  const { t } = useTranslation('vehicles')
  const rows = healthRows(unit)
  const offline = unit.status.presence === 'offline'
  const items = HEALTH_ROWS.map((id) => {
    const row = rows[id]
    const detailKey = row.ok ? (row.variant ?? 'ok') : 'fault'
    return { id, label: t(`health.${id}.label`), state: row.ok ? 'ok' : 'fault', detail: t(`health.${id}.${detailKey}`, row.params) }
  })
  const allOk = HEALTH_ROWS.every((id) => rows[id].ok)

  return (
    <Card as="section" className="vsection" aria-labelledby={`health-${vehicle.id}`}>
      <h2 id={`health-${vehicle.id}`} className="vsection__title">{t('health.title')}</h2>
      {offline && <p className="vsection__note">{t('health.offlineNote')}</p>}
      <CheckList items={items} label={t('health.title')} />
      {!offline && <p className={allOk ? 'vsection__ok' : 'vsection__warn'} role="status">{allOk ? t('health.allOk') : t('health.attention')}</p>}
      <p className="vsection__meta">
        {t('health.updated')} {unit.status.updatedAt ? <RelativeTime value={unit.status.updatedAt} /> : t('health.never')}
      </p>
    </Card>
  )
}
