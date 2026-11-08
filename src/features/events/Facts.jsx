import { useTranslation } from 'react-i18next'
import { RelativeTime } from '../../components/ui'
import { placeText } from '../../components/map/placeText'
import { formatDayTime } from '../../lib/time'

// Numbers measured by the unit for this kind of event: [label, value] rows. Keys come from the events namespace.
function measurementRows(t, event) {
  const m = event.measurements ?? {}
  switch (event.type) {
    case 'drowsiness':
      return [
        [t('measure.closure'), t('measure.seconds', { value: m.closureS })],
        [t('measure.perclos'), t('measure.percent', { value: Math.round((m.perclos ?? 0) * 100) })],
        [t('measure.yawns'), String(m.yawnCount ?? 0)],
      ]
    case 'crash_confirmed':
    case 'crash_cancelled':
    case 'impact_no_alert':
      return [
        [t('measure.peakG'), t('measure.g', { value: m.peakG })],
        [t('measure.deltaV'), t('measure.kmh', { value: m.deltaVKmh })],
        [t('measure.tilt'), t('measure.degrees', { value: m.tiltDeg })],
      ]
    case 'camera_fault':
      return [[t('measure.reason'), t(`measure.reasonValue.${m.reason}`, { defaultValue: m.reason })]]
    case 'sensor_fault':
      return [
        [t('measure.sensor'), t(`measure.sensorValue.${m.sensor}`, { defaultValue: m.sensor })],
        [t('measure.check'), t(`measure.checkValue.${m.check}`, { defaultValue: m.check })],
      ]
    case 'power':
      return [
        [t('measure.power'), t(`measure.powerValue.${m.kind}`, { defaultValue: m.kind })],
        ...(m.batteryPct !== undefined ? [[t('measure.battery'), t('measure.percent', { value: m.batteryPct })]] : []),
      ]
    default:
      return []
  }
}

function Rows({ rows }) {
  return (
    <dl className="evfacts">
      {rows.map(([label, value]) => (
        <div key={label} className="evfacts__row">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

export default function Facts({ event, vehicle, showPlace }) {
  const { t, i18n } = useTranslation('events')
  const { t: tm } = useTranslation('map')
  const measures = measurementRows(t, event)
  const details = [
    [t('facts.when'), <>{formatDayTime(event.time, i18n.language)} · <RelativeTime value={event.time} /></>],
    [t('facts.vehicle'), `${vehicle.name} · ${vehicle.plate}`],
    [t('facts.unit'), event.unitId],
    ...(showPlace ? [[t('facts.where'), placeText(tm, event.position.s)]] : []),
    [t('facts.speed'), t('measure.kmh', { value: event.speedKmh })],
    [t('facts.fixAge'), t('measure.secondsOld', { value: event.fixAgeS })],
    ...(event.receivedLate ? [[t('facts.received'), <>{formatDayTime(event.receivedAt, i18n.language)}</>]] : []),
  ]
  return (
    <>
      {measures.length > 0 && (
        <section className="evcard card" aria-labelledby="measure-title">
          <h2 id="measure-title" className="evcard__title">{t('measure.title')}</h2>
          <Rows rows={measures} />
        </section>
      )}
      <section className="evcard card" aria-labelledby="facts-title">
        <h2 id="facts-title" className="evcard__title">{t('facts.title')}</h2>
        <Rows rows={details} />
        {event.receivedLate && <p className="evcard__sub">{t('facts.lateNote')}</p>}
        {!showPlace && <p className="evcard__sub">{t('facts.placeHidden')}</p>}
      </section>
    </>
  )
}
