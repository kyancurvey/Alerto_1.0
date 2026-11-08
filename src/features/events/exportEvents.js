import { toCsv } from '../../lib/csv'
import { formatSheetTime } from '../../lib/time'

// The rows of the events spreadsheet: one line per event, with the measurements and message results in their own columns.
// `t` is the events translator, so headers and words follow the person's language.
export function buildEventsCsv({ t, events, state }) {
  const vehicleOf = (event) => state.vehicles.find((vehicle) => vehicle.id === event.vehicleId)
  const m = (event) => event.measurements ?? {}
  const smsSent = (event) => event.sms.filter((entry) => entry.status === 'sent').length
  const columns = [
    ['id', (e) => e.id],
    ['time', (e) => formatSheetTime(e.time)],
    ['vehicle', (e) => vehicleOf(e)?.name],
    ['plate', (e) => vehicleOf(e)?.plate],
    ['unit', (e) => e.unitId],
    ['type', (e) => t(`type.${e.type}`)],
    ['level', (e) => (e.type === 'drowsiness' ? e.level : '')],
    ['outcome', (e) => (e.open ? t('badge.inProgress') : e.outcome ? t(`outcome.${e.outcome}`) : '')],
    ['review', (e) => t(`review.${e.review}`, { defaultValue: '' })],
    ['speed', (e) => e.speedKmh],
    ['fixAge', (e) => e.fixAgeS],
    ['latitude', (e) => e.position?.lat],
    ['longitude', (e) => e.position?.lon],
    ['closure', (e) => m(e).closureS],
    ['perclos', (e) => (m(e).perclos === undefined ? '' : Math.round(m(e).perclos * 100))],
    ['yawns', (e) => m(e).yawnCount],
    ['peakG', (e) => m(e).peakG],
    ['deltaV', (e) => m(e).deltaVKmh],
    ['tilt', (e) => m(e).tiltDeg],
    ['smsSent', (e) => (e.sms.length ? smsSent(e) : '')],
    ['smsTotal', (e) => (e.sms.length ? e.sms.length : '')],
    ['acknowledgedBy', (e) => e.acks.map((ack) => ack.name).join('; ')],
    ['notes', (e) => e.notes.length + e.acks.filter((ack) => ack.note).length],
    ['receivedLate', (e) => (e.receivedLate ? t('csv.yes') : t('csv.no'))],
  ].map(([key, value]) => ({ label: t(`csv.${key}`), value }))
  return toCsv(columns, events)
}
