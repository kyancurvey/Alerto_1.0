import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CircleCheck, MapPin, TriangleAlert } from 'lucide-react'
import { Badge, Card, CheckList } from '../../components/ui'
import { formatClock } from '../../lib/time'
import useNow from '../../lib/useNow'
import { pathOf } from '../../routes'

const RING_R = 42
const RING_LEN = 2 * Math.PI * RING_R
const SMS_STATE = { sent: 'ok', retrying: 'running', queued: 'pending' }
const OUTCOME_VARIANT = { cancelled: 'ready', partial: 'caution', sent: 'crash' }

// The ring drains while the unit counts down; the number is in unit seconds.
function Ring({ alert }) {
  const { t } = useTranslation('home')
  const now = useNow(200)
  const total = alert.endsAt - alert.startedAt
  const fraction = total > 0 ? Math.min(1, Math.max(0, (alert.endsAt - now) / total)) : 0
  const seconds = Math.ceil(fraction * alert.countdownS)
  return (
    <div className="ring" role="timer" aria-label={t('crash.secondsLeft', { count: seconds })}>
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="ring__track" cx="50" cy="50" r={RING_R} />
        <circle className="ring__bar" cx="50" cy="50" r={RING_R} strokeDasharray={RING_LEN} strokeDashoffset={RING_LEN * (1 - fraction)} />
      </svg>
      <span className="ring__number" aria-hidden="true">{seconds}</span>
    </div>
  )
}

// Message status per contact, in the order the messages go out.
function Deliveries({ event, contacts, label }) {
  const { t } = useTranslation('home')
  const items = event.sms.map((entry) => ({
    id: entry.contactId,
    label: contacts.find((contact) => contact.id === entry.contactId)?.name ?? '',
    state: SMS_STATE[entry.status] ?? 'pending',
    detail: t(`crash.status.${entry.status}`, { attempt: Math.max(1, entry.attempts) }),
  }))
  return items.length > 0 ? <CheckList items={items} label={label} /> : null
}

// A crash on Home: the countdown ring, then the messages going out, then how it ended.
// `alert` is the running alert; without one, `event` is a crash that has just ended.
export default function CrashCard({ alert, event, contacts, vehicle, showVehicle, showMap }) {
  const { t, i18n } = useTranslation('home')
  const phase = alert ? alert.phase : event.type === 'crash_cancelled' ? 'cancelled' : 'done'
  const sent = event?.sms.filter((entry) => entry.status === 'sent').length ?? 0
  const total = event?.sms.length ?? 0
  const partial = phase === 'done' && sent < total
  const outcome = phase === 'cancelled' ? 'cancelled' : partial ? 'partial' : 'sent'
  const live = Boolean(alert)
  const eventId = alert ? alert.eventId : event.id
  const sendingEvent = alert && phase === 'sending' ? event : null

  return (
    <Card as="section" className={`crash crash--${live ? phase : outcome}`} role={live ? 'alert' : undefined} aria-label={t('crash.badge')}>
      <div className="crash__head">
        {phase === 'countdown' && <Ring alert={alert} />}
        {phase !== 'countdown' && (
          <span className="crash__icon" aria-hidden="true">
            {outcome === 'partial' || live ? <TriangleAlert size={28} /> : <CircleCheck size={28} />}
          </span>
        )}
        <div className="crash__text">
          <Badge variant={live ? 'crash' : OUTCOME_VARIANT[outcome]}>{t('crash.badge')}</Badge>
          <h2 className="crash__title">
            {phase === 'countdown' && t('crash.countdownTitle')}
            {phase === 'sending' && t('crash.sendingTitle')}
            {!live && t(`crash.${outcome}Title`, { sent, total })}
          </h2>
          <p>
            {phase === 'countdown' && t('crash.countdownDetail')}
            {phase === 'sending' && t('crash.sendingDetail')}
            {!live && t(`crash.${outcome}Detail`, { sent, total })}
          </p>
          <p className="crash__meta">
            {showVehicle && `${vehicle.name} · `}
            {t('crash.at', { time: formatClock(live ? alert.startedAt : event.time, i18n.language) })}
          </p>
        </div>
      </div>

      {sendingEvent && <Deliveries event={sendingEvent} contacts={contacts} label={t('crash.sendingTitle')} />}
      {!live && phase !== 'cancelled' && <Deliveries event={event} contacts={contacts} label={t(`crash.${outcome}Title`, { sent, total })} />}

      <div className="home__actions">
        <Link to={`${pathOf('events')}/${eventId}`} className="btn btn--outline">{t('crash.event')}</Link>
        {showMap && (
          <Link to={`${pathOf('map')}?alert=${eventId}`} className="btn btn--outline"><MapPin size={20} aria-hidden="true" />{t('alert.map')}</Link>
        )}
      </div>
    </Card>
  )
}
