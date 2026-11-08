import { ArrowLeft, CalendarClock, Lock } from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import RouteMap from '../../components/map/RouteMap'
import { Button, Card, EmptyState, Skeleton } from '../../components/ui'
import { canReviewEvent } from '../../lib/events'
import { can } from '../../lib/permissions'
import { formatDayTime } from '../../lib/time'
import useNow from '../../lib/useNow'
import { pathOf } from '../../routes'
import { useStore } from '../../store/StoreProvider'
import useSession from '../../store/useSession'
import { pinKindOf, selectContacts, selectEventDetail, selectEventScope } from '../../store/selectors'
import EventBadges from './EventBadges'
import Facts from './Facts'
import FollowUp from './FollowUp'
import ReviewCard from './ReviewCard'
import SmsDeliveries from './SmsDeliveries'
import Timeline from './Timeline'
import useEventsReady from './useEventsReady'
import './events.css'

const FOCUS_SPAN = 0.08

// Back goes to wherever the person came from (the list with its filters, Home, the map); a direct link goes to the list.
function BackButton() {
  const { t } = useTranslation('events')
  const navigate = useNavigate()
  const location = useLocation()
  const cameFromApp = location.key !== 'default'
  return (
    <Button variant="ghost" className="evdetail__back" onClick={() => (cameFromApp ? navigate(-1) : navigate(pathOf('events'), { replace: true }))}>
      <ArrowLeft size={20} aria-hidden="true" />{t('back')}
    </Button>
  )
}

export default function EventDetailPage() {
  const { t, i18n } = useTranslation('events')
  const { t: tm } = useTranslation('map')
  const { eventId } = useParams()
  const { state } = useStore()
  const { account, role } = useSession()
  const now = useNow(1000)
  const ready = useEventsReady()

  const scope = selectEventScope(state, account, { linked: can(role, 'followLinkedDrivers'), all: can(role, 'viewAllUnits') })
  const found = selectEventDetail(state, scope, eventId)

  if (!ready) {
    return (
      <div className="page" role="status" aria-label={t('loading')}>
        <Skeleton height="48px" />
        <Skeleton height="160px" />
        <Skeleton height="240px" />
      </div>
    )
  }

  if (!found) {
    return (
      <div className="page">
        <BackButton />
        <EmptyState
          icon={CalendarClock}
          title={t('notFound.title')}
          description={t('notFound.detail')}
          action={<Link to={pathOf('events')} className="btn btn--primary">{t('notFound.action')}</Link>}
        />
      </div>
    )
  }

  const { event, entry } = found
  const { vehicle } = entry
  const contacts = selectContacts(state, vehicle.id)
  const liveAlert = state.alerts.find((item) => item.eventId === event.id)
  const secondsLeft = liveAlert?.phase === 'countdown' ? Math.max(0, Math.ceil(((liveAlert.endsAt - now) / (liveAlert.endsAt - liveAlert.startedAt)) * liveAlert.countdownS)) : null
  const kind = pinKindOf(event) ?? 'event'
  const marker = { id: `e:${event.id}`, kind, s: event.position.s, active: event.open, label: tm('pin.marker', { kind: tm(`pin.${kind}`), time: formatDayTime(event.time, i18n.language) }) }
  const showsSms = event.type === 'crash_confirmed' || event.type === 'crash_cancelled'

  return (
    <div className="page evdetail">
      <BackButton />
      <header className="evdetail__head">
        <h1 className="page__title">{t(`type.${event.type}`)}</h1>
        <p className="evdetail__sub">{vehicle.name} · {formatDayTime(event.time, i18n.language)}</p>
        <div className="evdetail__badges"><EventBadges event={event} /></div>
        {secondsLeft !== null && <p className="evdetail__live" role="timer">{t('live.countdown', { count: secondsLeft })}</p>}
        {liveAlert?.phase === 'sending' && <p className="evdetail__live">{t('live.sending')}</p>}
      </header>

      {can(role, 'reviewEvents') && canReviewEvent(event) && <ReviewCard event={event} />}
      {(can(role, 'acknowledgeEvents') || event.acks.length > 0 || event.notes.length > 0 || can(role, 'addNotes')) && (
        <FollowUp event={event} me={account.id} canAcknowledge={can(role, 'acknowledgeEvents')} canNote={can(role, 'addNotes')} />
      )}

      <Timeline event={event} contacts={contacts} />
      {showsSms && <SmsDeliveries event={event} contacts={contacts} />}
      <Facts event={event} vehicle={vehicle} showPlace={entry.map} />

      {entry.map ? (
        <section className="evcard card evmapcard" aria-labelledby="map-title">
          <h2 id="map-title" className="evcard__title">{t('map.title')}</h2>
          <Card flush className="evdetail__map">
            <RouteMap
              markers={[marker]}
              selectedId={marker.id}
              focus={{ s0: Math.max(0, event.position.s - FOCUS_SPAN), s1: Math.min(1, event.position.s + FOCUS_SPAN), nonce: event.id }}
              gestures={false}
            />
          </Card>
          {entry.alerts && <Link to={`${pathOf('map')}?alert=${event.id}`} className="btn btn--outline">{t('map.around')}</Link>}
        </section>
      ) : (
        <section className="evcard card" aria-labelledby="map-title">
          <h2 id="map-title" className="evcard__title">{t('map.title')}</h2>
          <p className="evcard__sub evlocked"><Lock size={18} aria-hidden="true" />{t('map.locked')}</p>
        </section>
      )}
    </div>
  )
}
