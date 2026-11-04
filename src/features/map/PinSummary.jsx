import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, RelativeTime } from '../../components/ui'
import { placeText } from '../../components/map/placeText'
import { formatDayTime } from '../../lib/time'
import { pathOf } from '../../routes'

const KIND_BADGE = { crash: 'crash', cancelled: 'ready', critical: 'critical' }
const LEVEL_BADGE = { 1: 'caution', 2: 'warning' }

// What a pin on the map is: the alert, when and where it happened, and the way on to the event.
// Without `onAround` the card is already showing the minutes around the alert.
export default function PinSummary({ event, kind, vehicle, onAround }) {
  const { t, i18n } = useTranslation('map')
  const variant = KIND_BADGE[kind] ?? LEVEL_BADGE[event.level] ?? 'neutral'

  return (
    <Card as="section" className="pinsum" aria-labelledby={`pin-${event.id}`}>
      <div className="pinsum__badges">
        <Badge variant={variant}>{t(`pin.${kind}`)}</Badge>
        {event.open && <Badge variant="updating">{t('pin.inProgress')}</Badge>}
      </div>
      <h2 id={`pin-${event.id}`} className="pinsum__title">{vehicle.name}</h2>
      <dl className="pinsum__facts">
        <div>
          <dt>{t('pin.when')}</dt>
          <dd>{formatDayTime(event.time, i18n.language)} · <RelativeTime value={event.time} /></dd>
        </div>
        <div>
          <dt>{t('pin.where')}</dt>
          <dd>{placeText(t, event.position.s)}</dd>
        </div>
        <div>
          <dt>{t('pin.speed')}</dt>
          <dd>{t('pin.speedValue', { speed: event.speedKmh })}</dd>
        </div>
      </dl>
      <div className="pinsum__actions">
        <Link to={`${pathOf('events')}/${event.id}`} className="btn btn--primary">{t('pin.open')}</Link>
        {onAround && <Button variant="outline" onClick={onAround}>{t('pin.around')}</Button>}
      </div>
    </Card>
  )
}
