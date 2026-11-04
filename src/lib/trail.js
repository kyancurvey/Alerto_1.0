import { ROUTE_KM } from './route'
import { createRng } from '../sim/prng'

// The minutes around an alert: where the jeepney was and how fast it went, one point a minute.
// A unit only reports a position and speed with the event itself, so the minutes around it are worked out
// from that one record and the event id. The same event always gives the same trail.
export const TRAIL_MINUTES = 5
const MIN_MS = 60 * 1000
const MIN_SPEED_KMH = 12

// Speed after the alert, as a share of the speed before it, for minutes 1 to 5.
const AFTER = {
  crash_confirmed: [0, 0, 0, 0, 0],
  crash_cancelled: [0, 0.4, 0.8, 0.9, 1],
  impact_no_alert: [0.7, 0.9, 1, 1, 1],
  'drowsiness:1': [0.95, 1, 1, 1, 1],
  'drowsiness:2': [0.8, 0.7, 0.9, 1, 1],
  'drowsiness:3': [0.5, 0.2, 0, 0.3, 0.7],
}
const STEADY = [1, 1, 1, 1, 1]
const afterOf = (event) => AFTER[event.type === 'drowsiness' ? `drowsiness:${event.level}` : event.type] ?? STEADY

const hashOf = (text) => [...text].reduce((hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0, 7)

// Returns [{ minute, time, s, speedKmh }] from 5 minutes before to 5 minutes after (never later than `now`).
// `minute` 0 is the alert itself. `s` is the place along the route (0 to 1).
export function buildTrail(event, now) {
  const rng = createRng(hashOf(event.id))
  const cruise = Math.max(event.speedKmh, MIN_SPEED_KMH)
  const after = afterOf(event)

  const speeds = {}
  for (let minute = -TRAIL_MINUTES; minute <= TRAIL_MINUTES; minute += 1) {
    if (minute < 0) speeds[minute] = Math.round(cruise * rng.float(0.88, 1.12))
    else if (minute === 0) speeds[minute] = event.speedKmh
    else speeds[minute] = Math.round(cruise * after[minute - 1] * rng.float(0.94, 1.06))
  }

  // Share of the route covered in the minute that ends at `minute` (at its starting speed's average before the
  // alert, at the new speed after it: a crash stops the jeepney at once).
  const spanBefore = (minute) => (speeds[minute] + speeds[minute + 1]) / 2 / 60 / ROUTE_KM
  const spanAfter = (minute) => speeds[minute] / 60 / ROUTE_KM
  const before = Array.from({ length: TRAIL_MINUTES }, (_, index) => spanBefore(-TRAIL_MINUTES + index)).reduce((sum, span) => sum + span, 0)

  // Direction of travel: either way along the road, but the part before the alert must stay on the route.
  const start = event.position.s
  const forwardFits = start - before >= 0
  const backwardFits = start + before <= 1
  const dir = forwardFits && (!backwardFits || rng.chance(0.5)) ? 1 : -1
  const clamp = (s) => Math.min(1, Math.max(0, s))

  const points = [{ minute: 0, time: event.time, s: clamp(start), speedKmh: speeds[0] }]
  let s = start
  for (let minute = -1; minute >= -TRAIL_MINUTES; minute -= 1) {
    s -= dir * spanBefore(minute)
    points.unshift({ minute, time: event.time + minute * MIN_MS, s: clamp(s), speedKmh: speeds[minute] })
  }
  s = start
  for (let minute = 1; minute <= TRAIL_MINUTES; minute += 1) {
    s += dir * spanAfter(minute)
    if (event.time + minute * MIN_MS > now) break
    points.push({ minute, time: event.time + minute * MIN_MS, s: clamp(s), speedKmh: speeds[minute] })
  }
  return points
}
