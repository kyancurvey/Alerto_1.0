import { useTranslation } from 'react-i18next'
import { BatteryFull, BatteryLow, Clock, Cpu, Power, Satellite, Signal, TriangleAlert } from 'lucide-react'
import { Badge, Card, RelativeTime } from '../../components/ui'

const PRESENCE_VARIANT = { online: 'ready', parked: 'neutral', offline: 'neutral' }
const LOW_BATTERY_PCT = 20

// What the unit's light would show (spec 3.6): green ready, amber caution or fault, red warning, critical or crash.
export function unitState(status, alert) {
  if (status.presence !== 'online') return null
  if (status.mode === 'crashCountdown') return { variant: 'crash', key: 'crashCountdown' }
  if (status.mode === 'crashSending') return { variant: 'crash', key: 'crashSending' }
  if (status.mode === 'alerting') return { variant: ({ 1: 'caution', 2: 'warning', 3: 'critical' })[alert?.level] ?? 'caution', key: 'alerting' }
  if (status.mode === 'degraded' || status.faults.length > 0) return { variant: 'caution', key: 'needsAttention' }
  return { variant: 'ready', key: 'ready' }
}

function Fact({ icon: Icon, label, children }) {
  return (
    <div className="unit__fact">
      <dt className="unit__label"><Icon size={18} aria-hidden="true" />{label}</dt>
      <dd className="unit__value">{children}</dd>
    </div>
  )
}

export default function UnitCard({ vehicle, unit, alert, latestFirmware }) {
  const { t } = useTranslation('home')
  const { status } = unit
  const state = unitState(status, alert)
  const lowBattery = status.faults.includes('battery') || status.battery <= LOW_BATTERY_PCT
  const updateAvailable = unit.firmware !== latestFirmware

  return (
    <Card as="section" className="unit" aria-labelledby={`unit-${vehicle.id}`}>
      <div className="unit__head">
        <div className="unit__title">
          <h2 id={`unit-${vehicle.id}`}>{vehicle.name}</h2>
          <p className="unit__sub">{vehicle.plate} · {vehicle.route}</p>
        </div>
        <Badge variant={PRESENCE_VARIANT[status.presence]}>{t(`unit.presence.${status.presence}`)}</Badge>
      </div>

      {state && (
        <p className={`unit__state unit__state--${state.variant}`} role="status">
          <Badge variant={state.variant}>{t(`unit.state.${state.key}`)}</Badge>
        </p>
      )}
      {status.presence === 'offline' && <p className="unit__note">{t('unit.offlineNote')}</p>}

      {status.faults.map((fault) => (
        <p key={fault} className="unit__fault"><TriangleAlert size={20} aria-hidden="true" />{t(`unit.fault.${fault}`)}</p>
      ))}

      <dl className="unit__facts">
        <Fact icon={Clock} label={t('unit.lastSeen')}>{status.lastSeen ? <RelativeTime value={status.lastSeen} /> : t('unit.never')}</Fact>
        <Fact icon={Power} label={t('unit.ignition')}>{status.ignition ? t('unit.on') : t('unit.off')}</Fact>
        <Fact icon={lowBattery ? BatteryLow : BatteryFull} label={t('unit.battery')}>
          <span className={lowBattery ? 'unit__value--warn' : undefined}>{status.battery}%</span>
        </Fact>
        <Fact icon={Signal} label={t('unit.signal')}>{t('unit.signalValue', { level: status.signal })}</Fact>
        <Fact icon={Satellite} label={t('unit.gps')}>{t(`unit.gpsValue.${status.gps}`)}</Fact>
        <Fact icon={Cpu} label={t('unit.firmware')}>
          {unit.firmware}
          {updateAvailable && <Badge variant="updating" className="unit__update">{t('unit.updateAvailable')}</Badge>}
        </Fact>
      </dl>

      <p className="unit__updated">
        {t('unit.updated')} {status.updatedAt ? <RelativeTime value={status.updatedAt} /> : t('unit.never')}
      </p>
    </Card>
  )
}
