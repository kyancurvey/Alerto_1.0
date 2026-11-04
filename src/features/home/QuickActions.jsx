import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageSquare, Volume2 } from 'lucide-react'
import { Button, Card } from '../../components/ui'
import TestSheet from './TestSheet'

// The driver's two tests. They need the unit online and no alert running.
export default function QuickActions({ vehicle, unit, alerting }) {
  const { t } = useTranslation('home')
  const [kind, setKind] = useState(null)
  const online = unit.status.presence === 'online'
  const blocked = !online || alerting

  return (
    <Card as="section" className="quick" aria-labelledby={`quick-${vehicle.id}`}>
      <h2 id={`quick-${vehicle.id}`} className="quick__title">{t('actions.title')}</h2>
      <div className="quick__buttons">
        <Button variant="secondary" disabled={blocked} onClick={() => setKind('alarm')}>
          <Volume2 size={22} aria-hidden="true" />{t('actions.testAlarm')}
        </Button>
        <Button variant="secondary" disabled={blocked} onClick={() => setKind('sms')}>
          <MessageSquare size={22} aria-hidden="true" />{t('actions.testSms')}
        </Button>
      </div>
      {blocked && <p className="quick__hint">{online ? t('actions.needClear') : t('actions.needOnline')}</p>}
      <TestSheet kind={kind} vehicle={vehicle} onClose={() => setKind(null)} />
    </Card>
  )
}
