import { manilaDayStart } from './time'

// What the Events screens know about events: types, who may see which, filters, grouping.
export const EVENT_TYPES = ['drowsiness', 'crash_confirmed', 'crash_cancelled', 'impact_no_alert', 'camera_fault', 'sensor_fault', 'power']
// Alerts follow what a driver shares as "alerts"; the rest are about the unit and follow "unit status".
export const ALERT_TYPES = ['drowsiness', 'crash_confirmed', 'crash_cancelled', 'impact_no_alert']
export const isAlertType = (type) => ALERT_TYPES.includes(type)

export const LEVELS = ['1', '2', '3']
export const PERIODS = ['any', 'today', '7', '30', 'custom']
export const DEFAULT_FILTERS = { vehicle: 'all', type: 'all', level: 'all', period: 'any', from: '', to: '' }

const DAY_MS = 24 * 60 * 60 * 1000
const DATE_TEXT = /^\d{4}-\d{2}-\d{2}$/

// Filters live in the address (?type=crash_confirmed&period=7), so Back from an event keeps them.
export function parseFilters(params) {
  const get = (key) => params.get(key) ?? ''
  const period = PERIODS.includes(get('period')) ? get('period') : 'any'
  return {
    vehicle: get('vehicle') || 'all',
    type: EVENT_TYPES.includes(get('type')) ? get('type') : 'all',
    level: LEVELS.includes(get('level')) ? get('level') : 'all',
    period,
    from: period === 'custom' && DATE_TEXT.test(get('from')) ? get('from') : '',
    to: period === 'custom' && DATE_TEXT.test(get('to')) ? get('to') : '',
  }
}

export const levelApplies = (filters) => filters.type === 'all' || filters.type === 'drowsiness'

export const activeFilterCount = (filters) =>
  ['vehicle', 'type', 'period'].filter((key) => filters[key] !== DEFAULT_FILTERS[key]).length + (filters.level !== 'all' && levelApplies(filters) ? 1 : 0)

// [start, end) in milliseconds. Days are Asia/Manila days. 7 and 30 days include today.
export function periodRange(filters, now) {
  const today = manilaDayStart(now)
  const dayStart = (text) => Date.parse(`${text}T00:00:00+08:00`)
  switch (filters.period) {
    case 'today': return [today, Infinity]
    case '7': return [today - 6 * DAY_MS, Infinity]
    case '30': return [today - 29 * DAY_MS, Infinity]
    case 'custom': {
      const from = filters.from ? dayStart(filters.from) : -Infinity
      const to = filters.to ? dayStart(filters.to) + DAY_MS : Infinity
      return [Number.isNaN(from) ? -Infinity : from, Number.isNaN(to) ? Infinity : to]
    }
    default: return [-Infinity, Infinity]
  }
}

export function matchesFilters(event, filters, now) {
  if (filters.vehicle !== 'all' && event.vehicleId !== filters.vehicle) return false
  if (filters.type !== 'all' && event.type !== filters.type) return false
  if (filters.level !== 'all' && levelApplies(filters) && !(event.type === 'drowsiness' && String(event.level) === filters.level)) return false
  const [start, end] = periodRange(filters, now)
  return event.time >= start && event.time < end
}

// Newest first, one group per Asia/Manila day: [{ start, events }].
export function groupByDay(events) {
  const groups = []
  events.forEach((event) => {
    const start = manilaDayStart(event.time)
    const last = groups[groups.length - 1]
    if (last && last.start === start) last.events.push(event)
    else groups.push({ start, events: [event] })
  })
  return groups
}

// Badge colour for each part of an event.
export const LEVEL_VARIANT = { 1: 'caution', 2: 'warning', 3: 'critical' }
const OUTCOME_VARIANT = { sms_sent: 'ready', sms_partial: 'caution', cancelled_by_driver: 'ready', resolved: 'ready', escalated: 'neutral', dismissed: 'neutral', logged: 'neutral' }
export const outcomeVariant = (outcome) => OUTCOME_VARIANT[outcome] ?? 'neutral'

// Alerts a driver can mark as real or a false alarm, once they have ended.
export const canReviewEvent = (event) => isAlertType(event.type) && !event.open
export const REVIEW_CHOICES = ['real', 'false_alarm']
