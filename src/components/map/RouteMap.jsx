import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bus, CircleCheck, MapPin, Maximize, Minus, Plus, Siren, TriangleAlert } from 'lucide-react'
import { ROUTE_TOWNS } from '../../lib/route'
import { ROUTE_PATH, WORLD, boundsBetween, toPath, xyAt, xyBetween } from './projection'
import './routeMap.css'

// A drawn map of the Batangas City to Rosario corridor: soft land and water, one road, three town labels.
// No tiles and no network. Pages feed it plain data and it draws, zooms and pans.
//
//   markers   [{ id, kind, s, label, live?, idle?, active?, isNew? }]
//             kind: 'vehicle' | 'crash' | 'cancelled' | 'critical' | 'event'
//             s: place along the route (0 to 1). label: the spoken name. live: the unit is online (pulses, glides).
//             idle: parked or offline (grey). active: an alert in progress (pulses). isNew: drops in.
//   trail     points from lib/trail.js buildTrail(): the minutes around an alert, with a speed marker each minute
//   selectedId, onSelect(id)    which marker is highlighted, and what happens on tap (omit for a look-only map)
//   focus     { s0, s1, nonce? } the stretch of route to show. Nothing shows the whole route.
//             Change `nonce` to bring the view back to the same stretch.
//   controls  zoom buttons (default true)     gestures  drag, pinch, Ctrl+wheel (default true)
//   label     spoken name of the map          className  extra class, for example to set --map-h

const PIN_ICON = { crash: TriangleAlert, cancelled: CircleCheck, critical: Siren, event: MapPin }
const PIN_SHAPE = 'M0 0 L-12.25 -17.35 A15 15 0 1 1 12.25 -17.35 Z'
const PIN_HEAD = -26
const ZOOM_STEP = 1.6
const MAX_ZOOM = 14
const FIT_PADDING = 40
const DRAG_THRESHOLD = 6
const TOWN_LABEL = {
  batangasCity: { dx: 14, dy: 30, anchor: 'start' },
  ibaan: { dx: -16, dy: 5, anchor: 'end' },
  rosario: { dx: -16, dy: 5, anchor: 'end' },
}
const DRAW_ORDER = { cancelled: 0, crash: 1, critical: 1, event: 1, vehicle: 2 }

const clamp = (value, low, high) => Math.min(high, Math.max(low, value))

// ---------- Drawn scenery (the same every time) ----------
const [START, MIDDLE, END] = ROUTE_TOWNS.map((town) => xyAt(town.s))
const curve = (from, ...offsets) => {
  const [a, b, c] = offsets.map(([dx, dy]) => `${(from.x + dx).toFixed(0)} ${(from.y + dy).toFixed(0)}`)
  return `M${from.x.toFixed(0)} ${from.y.toFixed(0)} C${a} ${b} ${c}`
}
const SIDE_ROADS = [
  curve(START, [-30, -180], [-90, -380], [-40, -620]),
  curve({ x: START.x - 90, y: START.y + 60 }, [150, 10], [330, 90], [520, 280]),
  curve({ x: MIDDLE.x - 260, y: MIDDLE.y + 70 }, [120, 30], [330, -10], [520, -120]),
  curve({ x: MIDDLE.x - 70, y: MIDDLE.y + 300 }, [20, 120], [20, -120], [90, -340]),
  curve({ x: END.x - 300, y: END.y + 110 }, [150, 40], [330, -20], [560, -140]),
  curve({ x: END.x - 60, y: END.y + 340 }, [20, 110], [10, -110], [70, -300]),
]
const WATER = `M${WORLD.x0} 600 C-200 640 -60 760 -20 900 C10 1020 40 1120 30 1230 C20 1330 -60 1440 -100 ${WORLD.y1} L${WORLD.x0} ${WORLD.y1} Z`
const PATCHES = [
  { cx: 380, cy: 1320, rx: 230, ry: 100 },
  { cx: 760, cy: 1000, rx: 180, ry: 90 },
  { cx: 260, cy: 600, rx: 200, ry: 120 },
  { cx: 1180, cy: 820, rx: 220, ry: 130 },
  { cx: 1050, cy: 80, rx: 220, ry: 90 },
  { cx: 520, cy: 330, rx: 170, ry: 80 },
]
const SCENERY = (
  <g aria-hidden="true">
    <rect className="rm-land" x={WORLD.x0} y={WORLD.y0} width={WORLD.x1 - WORLD.x0} height={WORLD.y1 - WORLD.y0} />
    <path className="rm-water" d={WATER} />
    {PATCHES.map((patch) => <ellipse key={`${patch.cx}-${patch.cy}`} className="rm-patch" {...patch} />)}
    {SIDE_ROADS.map((path) => <path key={path} className="rm-side" d={path} />)}
    <path className="rm-road-edge" d={ROUTE_PATH} />
    <path className="rm-road" d={ROUTE_PATH} />
  </g>
)

// ---------- View: where the drawing sits in the box ----------
function fitView(size, s0, s1) {
  const box = boundsBetween(s0, s1)
  const k = Math.min((size.w - 2 * FIT_PADDING) / box.width, (size.h - 2 * FIT_PADDING) / box.height)
  return { k, x: size.w / 2 - box.cx * k, y: size.h / 2 - box.cy * k }
}

function zoomLimits(size) {
  const min = Math.max(size.w / (WORLD.x1 - WORLD.x0), size.h / (WORLD.y1 - WORLD.y0))
  return { min, max: Math.max(fitView(size, 0, 1).k * MAX_ZOOM, min) }
}

function constrain(view, size) {
  const { min, max } = zoomLimits(size)
  const k = clamp(view.k, min, max)
  return { k, x: clamp(view.x, size.w - k * WORLD.x1, -k * WORLD.x0), y: clamp(view.y, size.h - k * WORLD.y1, -k * WORLD.y0) }
}

// Zoom by `factor`, keeping the drawing under (px, py) where it is.
function zoomed(view, size, factor, px, py) {
  const { min, max } = zoomLimits(size)
  const f = clamp(view.k * factor, min, max) / view.k
  return { k: view.k * f, x: px - (px - view.x) * f, y: py - (py - view.y) * f }
}

// ---------- Pieces ----------
function Marker({ marker, selected, inv, onSelect, draggedRef }) {
  const { x, y } = xyAt(marker.s)
  const vehicle = marker.kind === 'vehicle'
  const dot = vehicle || marker.kind === 'cancelled'
  const Icon = vehicle ? Bus : PIN_ICON[marker.kind]
  const cy = dot ? 0 : PIN_HEAD
  const pick = () => {
    if (!draggedRef.current) onSelect?.(marker.id)
  }
  const onKeyDown = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onSelect?.(marker.id)
  }
  const classes = ['rm-marker', `rm-marker--${marker.kind}`, marker.idle && 'rm-marker--idle', selected && 'rm-marker--selected', marker.isNew && 'rm-marker--new']

  return (
    <g className={[marker.live && 'rm-live'].filter(Boolean).join(' ')} style={{ transform: `translate(${x}px, ${y}px)` }}>
      <g style={{ transform: `scale(${inv})` }}>
        <g
          className={classes.filter(Boolean).join(' ')}
          role={onSelect ? 'button' : undefined}
          tabIndex={onSelect ? 0 : undefined}
          aria-label={marker.label}
          aria-pressed={onSelect ? selected : undefined}
          onClick={onSelect ? pick : undefined}
          onKeyDown={onSelect ? onKeyDown : undefined}
        >
          {(marker.live || marker.active) && <circle className="rm-pulse" cy={cy} r={dot ? 15 : 17} />}
          {selected && dot && <circle className="rm-ring" r={vehicle ? 22 : 17} />}
          {vehicle && <circle className="rm-vehicle" r="15" />}
          {marker.kind === 'cancelled' && <circle className="rm-pin" r="11" />}
          {!dot && <path className="rm-pin" d={PIN_SHAPE} />}
          <Icon className="rm-icon" x={vehicle ? -9 : marker.kind === 'cancelled' ? -7 : -9} y={cy - (marker.kind === 'cancelled' ? 7 : 9)} size={marker.kind === 'cancelled' ? 14 : 18} aria-hidden="true" />
          <circle className="rm-focus" cy={cy} r="24" />
          <circle className="rm-hit" cy={cy} r="24" />
        </g>
      </g>
    </g>
  )
}

function Towns({ inv }) {
  const { t } = useTranslation('map')
  return ROUTE_TOWNS.map((town) => {
    const { x, y } = xyAt(town.s)
    const place = TOWN_LABEL[town.key]
    return (
      <g key={town.key} transform={`translate(${x} ${y}) scale(${inv})`} aria-hidden="true">
        <circle className="rm-town" r="6" />
        <text className="rm-label" x={place.dx} y={place.dy} textAnchor={place.anchor}>{t(`towns.${town.key}`)}</text>
      </g>
    )
  })
}

// The line follows the road between the trail's points; the speed markers sit on it, one a minute.
const through = (points) => toPath(points.flatMap((point, index) => (index === 0 ? [xyAt(point.s)] : xyBetween(points[index - 1].s, point.s))))

// Minutes spent standing still in one place are one marker, not five on top of each other.
function groupStops(points) {
  return points
    .filter((point) => point.minute !== 0)
    .reduce((groups, point) => {
      const last = groups[groups.length - 1]
      if (last && point.minute > 0 && last.minute > 0 && point.speedKmh === 0 && last.speedKmh === 0 && Math.abs(point.s - last.s) < 0.0005) {
        last.lastMinute = point.minute
      } else groups.push({ ...point, lastMinute: point.minute })
      return groups
    }, [])
}

function Trail({ points, inv }) {
  const { t } = useTranslation('map')
  const before = points.filter((point) => point.minute <= 0)
  const after = points.filter((point) => point.minute >= 0)
  return (
    <g>
      {before.length > 1 && <path className="rm-trail rm-trail--before" d={through(before)} />}
      {after.length > 1 && <path className="rm-trail rm-trail--after" d={through(after)} />}
      {groupStops(points).map((point) => {
        const { x, y } = xyAt(point.s)
        const isAfter = point.minute > 0
        const minutes = Math.abs(point.minute)
        const name = !isAfter
          ? t('around.markerBefore', { minutes, speed: point.speedKmh })
          : point.lastMinute > point.minute
            ? t('around.markerAfterRange', { from: point.minute, to: point.lastMinute, speed: point.speedKmh })
            : t('around.markerAfter', { minutes, speed: point.speedKmh })
        return (
          <g key={point.minute} className={`rm-speed ${isAfter ? 'rm-speed--after' : ''}`} transform={`translate(${x} ${y}) scale(${inv})`} role="img" aria-label={name}>
            <circle className="rm-speed__dot" r="13" />
            <text className="rm-speed__text" aria-hidden="true">{point.speedKmh}</text>
          </g>
        )
      })}
    </g>
  )
}

// ---------- The map ----------
export default function RouteMap({ markers = [], trail = null, selectedId = null, onSelect, focus = null, controls = true, gestures = true, label, className = '' }) {
  const { t } = useTranslation('map')
  const boxRef = useRef(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const viewRef = useRef(null)
  const pointers = useRef(new Map())
  const draggedRef = useRef(false)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [view, setView] = useState(null)

  const apply = useCallback((next) => {
    const settled = constrain(next, sizeRef.current)
    viewRef.current = settled
    setView(settled)
  }, [])

  // Keep track of the box size.
  useLayoutEffect(() => {
    const box = boxRef.current
    const measure = () => {
      const rect = box.getBoundingClientRect()
      const next = { w: Math.round(rect.width), h: Math.round(rect.height) }
      sizeRef.current = next
      setSize((previous) => (previous.w === next.w && previous.h === next.h ? previous : next))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  // Show the whole route, or the stretch asked for, at first and whenever that changes.
  const s0 = focus?.s0 ?? 0
  const s1 = focus?.s1 ?? 1
  const nonce = focus?.nonce
  const reset = useCallback(() => {
    if (sizeRef.current.w > 0) apply(fitView(sizeRef.current, s0, s1))
  }, [apply, s0, s1])
  useLayoutEffect(() => {
    reset()
  }, [reset, size.w, size.h, nonce])

  const zoomBy = useCallback((factor, px = sizeRef.current.w / 2, py = sizeRef.current.h / 2) => {
    if (viewRef.current) apply(zoomed(viewRef.current, sizeRef.current, factor, px, py))
  }, [apply])

  // Ctrl or Command with the wheel (and a trackpad pinch) zooms; the plain wheel keeps scrolling the page.
  useEffect(() => {
    if (!gestures) return undefined
    const box = boxRef.current
    const onWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      const rect = box.getBoundingClientRect()
      zoomBy(Math.exp(-event.deltaY * 0.01), event.clientX - rect.left, event.clientY - rect.top)
    }
    box.addEventListener('wheel', onWheel, { passive: false })
    return () => box.removeEventListener('wheel', onWheel)
  }, [gestures, zoomBy])

  const local = (event) => {
    const rect = boxRef.current.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  // One finger or the mouse pans; two fingers pinch. A drag only starts after a few pixels, so a tap still reaches the marker.
  const onPointerDown = (event) => {
    if (!gestures || event.target.closest('.routemap__controls')) return
    draggedRef.current = false
    const point = local(event)
    pointers.current.set(event.pointerId, { ...point, origin: point, moved: false })
  }

  const onPointerMove = (event) => {
    const entry = pointers.current.get(event.pointerId)
    const current = viewRef.current
    if (!entry || !current) return
    const point = local(event)
    const other = [...pointers.current.entries()].find(([id]) => id !== event.pointerId)?.[1]

    if (other) {
      const before = Math.hypot(entry.x - other.x, entry.y - other.y)
      const after = Math.hypot(point.x - other.x, point.y - other.y)
      const middleBefore = { x: (entry.x + other.x) / 2, y: (entry.y + other.y) / 2 }
      const middleAfter = { x: (point.x + other.x) / 2, y: (point.y + other.y) / 2 }
      const next = before > 0 ? zoomed(current, sizeRef.current, after / before, middleBefore.x, middleBefore.y) : current
      apply({ ...next, x: next.x + middleAfter.x - middleBefore.x, y: next.y + middleAfter.y - middleBefore.y })
      entry.x = point.x
      entry.y = point.y
      entry.moved = true
      draggedRef.current = true
      return
    }

    if (!entry.moved) {
      if (Math.hypot(point.x - entry.origin.x, point.y - entry.origin.y) < DRAG_THRESHOLD) return
      entry.moved = true
      draggedRef.current = true
      boxRef.current.setPointerCapture?.(event.pointerId)
    }
    apply({ ...current, x: current.x + point.x - entry.x, y: current.y + point.y - entry.y })
    entry.x = point.x
    entry.y = point.y
  }

  const onPointerEnd = (event) => {
    pointers.current.delete(event.pointerId)
    if (boxRef.current?.hasPointerCapture?.(event.pointerId)) boxRef.current.releasePointerCapture(event.pointerId)
  }

  const inv = view ? 1 / view.k : 1
  const ordered = [...markers].sort((a, b) => Number(a.id === selectedId) - Number(b.id === selectedId) || DRAW_ORDER[a.kind] - DRAW_ORDER[b.kind])

  return (
    <div
      ref={boxRef}
      className={['routemap', !gestures && 'routemap--still', className].filter(Boolean).join(' ')}
      role="group"
      aria-label={label ?? t('mapLabel')}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      {view && (
        <svg className="routemap__svg" width={size.w} height={size.h}>
          <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
            {SCENERY}
            {trail && trail.length > 1 && <Trail points={trail} inv={inv} />}
            <Towns inv={inv} />
            {ordered.map((marker) => (
              <Marker key={marker.id} marker={marker} selected={marker.id === selectedId} inv={inv} onSelect={onSelect} draggedRef={draggedRef} />
            ))}
          </g>
        </svg>
      )}
      {controls && (
        <div className="routemap__controls">
          <button type="button" className="routemap__btn" onClick={() => zoomBy(ZOOM_STEP)} aria-label={t('controls.zoomIn')}><Plus size={22} aria-hidden="true" /></button>
          <button type="button" className="routemap__btn" onClick={() => zoomBy(1 / ZOOM_STEP)} aria-label={t('controls.zoomOut')}><Minus size={22} aria-hidden="true" /></button>
          <button type="button" className="routemap__btn" onClick={reset} aria-label={t('controls.reset')}><Maximize size={22} aria-hidden="true" /></button>
        </div>
      )}
    </div>
  )
}
