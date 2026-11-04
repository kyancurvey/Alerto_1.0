import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Lock, Map as MapIcon } from 'lucide-react'
import Page from '../../components/layout/Page'
import RouteMap from '../../components/map/RouteMap'
import { Card, EmptyState, RelativeTime, Skeleton } from '../../components/ui'
import { latency } from '../../lib/latency'
import { can } from '../../lib/permissions'
import { buildTrail } from '../../lib/trail'
import { formatClock } from '../../lib/time'
import useNow from '../../lib/useNow'
import { useStore } from '../../store/StoreProvider'
import useSession from '../../store/useSession'
import { pinKindOf, selectMapAccess, selectMapPins, selectSettings, selectUnitOfVehicle } from '../../store/selectors'
import AroundBar from './AroundBar'
import PinSummary from './PinSummary'
import VehicleList from './VehicleList'
import VehicleSummary from './VehicleSummary'
import './map.css'

const NEW_PIN_MS = 6000
const FOCUS_SPAN = 0.08
const KINDS = ['vehicle', 'crash', 'cancelled', 'critical']

// The stretch of route the whole trail of an alert covers (so the view does not change as the minutes pass).
function trailRange(event) {
  const places = buildTrail(event, Number.MAX_SAFE_INTEGER).map((point) => point.s)
  return { s0: Math.min(...places), s1: Math.max(...places), nonce: event.id }
}

// The first visit after opening the app waits a moment for the map, like a real one would.
let mapShown = false
function useMapReady() {
  const [ready, setReady] = useState(mapShown)
  useEffect(() => {
    if (mapShown) return undefined
    let current = true
    latency().then(() => {
      mapShown = true
      if (current) setReady(true)
    })
    return () => {
      current = false
    }
  }, [])
  return ready
}

function Legend() {
  const { t } = useTranslation('map')
  return (
    <ul className="maplegend" aria-label={t('legend.title')}>
      {KINDS.map((kind) => (
        <li key={kind} className="maplegend__item">
          <span className={`maplegend__swatch maplegend__swatch--${kind}`} aria-hidden="true" />
          {t(`legend.${kind}`)}
        </li>
      ))}
    </ul>
  )
}

export default function MapPage() {
  const { t, i18n } = useTranslation('map')
  const { state } = useStore()
  const { account, role } = useSession()
  const [params, setParams] = useSearchParams()
  const now = useNow(1000)
  const ready = useMapReady()
  const [picked, setPicked] = useState(null)
  const [focus, setFocus] = useState(null)

  const access = selectMapAccess(state, account, { linked: can(role, 'followLinkedDrivers'), all: can(role, 'viewAllUnits') })
  const { entries } = access
  const vehicles = entries.map((entry) => entry.vehicle)
  const showVehicle = vehicles.length > 1
  const vehicleOf = (id) => vehicles.find((vehicle) => vehicle.id === id)
  const pins = selectMapPins(state, entries.filter((entry) => entry.pins).map((entry) => entry.vehicle.id))

  // "Around an alert": any alert the person may see, opened from a pin or from a link on Home.
  const aroundId = params.get('alert')
  const aroundEvent = aroundId ? state.events.find((event) => event.id === aroundId && entries.some((entry) => entry.pins && entry.vehicle.id === event.vehicleId)) : null
  const aroundKind = aroundEvent ? pinKindOf(aroundEvent) ?? 'event' : null

  const stateLabel = (vehicle) => t(`unit.presence.${selectUnitOfVehicle(state, vehicle.id)?.status.presence ?? 'offline'}`, { ns: 'home' })
  const pinLabel = (event, kind) => t('pin.marker', { kind: t(`pin.${kind}`), time: formatClock(event.time, i18n.language) })

  const vehicleMarkers = vehicles.flatMap((vehicle) => {
    const status = selectUnitOfVehicle(state, vehicle.id)?.status
    if (!status?.position) return []
    const online = status.presence === 'online'
    return [{ id: `v:${vehicle.id}`, kind: 'vehicle', s: status.position.s, live: online, idle: !online, label: t('vehicle.marker', { name: vehicle.name, state: stateLabel(vehicle) }) }]
  })
  const pinMarkers = pins.map(({ event, kind }) => ({
    id: `e:${event.id}`, kind, s: event.position.s, active: event.open, isNew: now - event.time < NEW_PIN_MS, label: pinLabel(event, kind),
  }))
  const markers = aroundEvent
    ? [{ id: `e:${aroundEvent.id}`, kind: aroundKind, s: aroundEvent.position.s, active: aroundEvent.open, label: pinLabel(aroundEvent, aroundKind) }]
    : [...vehicleMarkers, ...pinMarkers]

  const trail = aroundEvent ? buildTrail(aroundEvent, now) : null
  const aroundFocus = aroundEvent ? trailRange(aroundEvent) : null

  // Selected marker: the one tapped, or the active vehicle to start with.
  const fallback = vehicleMarkers.find((marker) => marker.id === `v:${state.activeVehicleId}`) ?? vehicleMarkers[0] ?? null
  const selectedId = aroundEvent ? markers[0].id : markers.some((marker) => marker.id === picked) ? picked : fallback?.id ?? null
  const selectedPin = pins.find(({ event }) => `e:${event.id}` === selectedId)
  const selectedVehicle = vehicles.find((vehicle) => `v:${vehicle.id}` === selectedId)
  const selectedUnit = selectedVehicle ? selectUnitOfVehicle(state, selectedVehicle.id) : null
  const summaryEvent = aroundEvent ?? selectedPin?.event ?? null
  const summaryKind = aroundEvent ? aroundKind : selectedPin?.kind

  const lookAt = (s) => setFocus({ s0: Math.max(0, s - FOCUS_SPAN), s1: Math.min(1, s + FOCUS_SPAN), nonce: Date.now() })
  const openAround = (eventId) => setParams({ alert: eventId })
  const closeAround = () => setParams({})
  const chooseVehicle = (vehicle) => {
    const marker = vehicleMarkers.find((item) => item.id === `v:${vehicle.id}`)
    setPicked(`v:${vehicle.id}`)
    if (marker) lookAt(marker.s)
  }

  const updatedAt = Math.max(0, ...vehicles.map((vehicle) => selectUnitOfVehicle(state, vehicle.id)?.status.updatedAt ?? 0))

  if (!ready) {
    return (
      <Page title={t('title')}>
        <div role="status" aria-label={t('loading')}>
          <Skeleton height="min(60vh, 420px)" />
        </div>
      </Page>
    )
  }
  if (access.locked) {
    return (
      <Page title={t('title')}>
        <EmptyState icon={Lock} title={t('locked.title')} description={access.lockedName ? t('locked.detail', { name: access.lockedName }) : t('locked.detailNoName')} />
      </Page>
    )
  }
  if (entries.length === 0) {
    return (
      <Page title={t('title')}>
        <EmptyState icon={MapIcon} title={t('empty.title')} description={t('empty.detail')} />
      </Page>
    )
  }

  return (
    <Page title={t('title')}>
      <div className="mappage">
        <div className="mappage__main">
          {aroundEvent && <AroundBar event={aroundEvent} now={now} onBack={closeAround} />}
          <Card flush className="mappage__map">
            <RouteMap
              markers={markers}
              trail={trail}
              selectedId={selectedId}
              onSelect={aroundEvent ? undefined : setPicked}
              focus={aroundEvent ? aroundFocus : focus}
            />
          </Card>
          {!aroundEvent && <Legend />}
          {updatedAt > 0 && <p className="mappage__updated">{t('updated')} <RelativeTime value={updatedAt} /></p>}
        </div>

        <div className="mappage__side">
          {summaryEvent && (
            <PinSummary
              event={summaryEvent}
              kind={summaryKind}
              vehicle={vehicleOf(summaryEvent.vehicleId)}
              onAround={aroundEvent ? undefined : () => openAround(summaryEvent.id)}
            />
          )}
          {selectedVehicle && !aroundEvent && (
            <VehicleSummary vehicle={selectedVehicle} unit={selectedUnit} reportsOn={Boolean(selectSettings(state, selectedUnit.id)?.positionReports)} />
          )}
          {!aroundEvent && showVehicle && (
            <VehicleList vehicles={vehicles} selectedId={selectedId} onChoose={chooseVehicle} showOwner={can(role, 'viewAllUnits')} />
          )}
        </div>
      </div>
    </Page>
  )
}
