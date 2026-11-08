import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Bell, ChevronRight, CircleCheck, Cpu, Eye, EyeOff, Power, TriangleAlert } from 'lucide-react'
import { formatClock } from '../../lib/time'
import { pathOf } from '../../routes'
import EventBadges from './EventBadges'

const TYPE_ICON = { drowsiness: Eye, crash_confirmed: TriangleAlert, crash_cancelled: CircleCheck, impact_no_alert: Bell, camera_fault: EyeOff, sensor_fault: Cpu, power: Power }
const TYPE_TONE = { drowsiness: 'caution', crash_confirmed: 'crash', crash_cancelled: 'ready', impact_no_alert: 'neutral', camera_fault: 'caution', sensor_fault: 'caution', power: 'neutral' }

export const iconOfType = (type) => TYPE_ICON[type] ?? Bell
export const toneOfEvent = (event) => (event.type === 'drowsiness' && event.level >= 2 ? 'crash' : TYPE_TONE[event.type] ?? 'neutral')

// One event in the list: what it was, when, on which vehicle, how it ended.
export default function EventRow({ event, vehicle, showVehicle }) {
  const { t, i18n } = useTranslation('events')
  const Icon = iconOfType(event.type)
  return (
    <Link to={`${pathOf('events')}/${event.id}`} className="evrow">
      <span className={`evrow__icon evrow__icon--${toneOfEvent(event)}`} aria-hidden="true"><Icon size={22} /></span>
      <span className="evrow__text">
        <span className="evrow__title">{t(`type.${event.type}`)}</span>
        <span className="evrow__meta">{formatClock(event.time, i18n.language)}{showVehicle && vehicle ? ` · ${vehicle.name}` : ''}</span>
        <span className="evrow__badges"><EventBadges event={event} /></span>
      </span>
      <ChevronRight className="evrow__chevron" size={20} aria-hidden="true" />
    </Link>
  )
}
