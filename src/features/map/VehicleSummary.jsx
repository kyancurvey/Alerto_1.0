import { useTranslation } from 'react-i18next'
import { Badge, Card, RelativeTime } from '../../components/ui'
import { placeText } from '../../components/map/placeText'

// A vehicle on the map: where it is, when it was last heard from, and whether its position is live.
export default function VehicleSummary({ vehicle, unit, reportsOn }) {
  const { t } = useTranslation('map')
  const { status } = unit
  const online = status.presence === 'online'

  return (
    <Card as="section" className="pinsum" aria-labelledby={`veh-${vehicle.id}`}>
      <div className="pinsum__badges">
        <Badge variant={online ? 'ready' : 'neutral'}>{t(`unit.presence.${status.presence}`, { ns: 'home' })}</Badge>
      </div>
      <h2 id={`veh-${vehicle.id}`} className="pinsum__title">{vehicle.name}</h2>
      <p className="pinsum__sub">{vehicle.plate}</p>
      <dl className="pinsum__facts">
        <div>
          <dt>{t('vehicle.position')}</dt>
          <dd>{status.position ? placeText(t, status.position.s) : '–'}</dd>
        </div>
        <div>
          <dt>{t('vehicle.lastSeen')}</dt>
          <dd>{status.lastSeen ? <RelativeTime value={status.lastSeen} /> : t('unit.never', { ns: 'home' })}</dd>
        </div>
      </dl>
      {online && <p className="pinsum__note">{reportsOn ? t('vehicle.live') : t('vehicle.reportsOff')}</p>}
      {status.presence === 'offline' && <p className="pinsum__note">{t('unit.offlineNote', { ns: 'home' })}</p>}
    </Card>
  )
}
