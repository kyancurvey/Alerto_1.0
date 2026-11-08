import { useTranslation } from 'react-i18next'
import { formatClock, formatElapsed } from '../../lib/time'

// Words and colour for each step a unit writes. Steps this screen does not know are left out.
const STEPS = {
  detected: (s) => ({ tone: s.level === 1 ? 'caution' : 'crash', params: { level: s.level } }),
  alarm: (s) => ({ tone: s.level === 1 ? 'caution' : 'crash', params: { level: s.level } }),
  button_pressed: () => ({ tone: 'neutral' }),
  cleared: () => ({ tone: 'ready' }),
  escalated: () => ({ tone: 'caution' }),
  impact: () => ({ tone: 'crash' }),
  confirmed: () => ({ tone: 'crash' }),
  countdown_started: (s) => ({ tone: 'crash', params: { seconds: s.seconds } }),
  cancelled: (s) => ({ tone: 'ready', params: { seconds: s.atS } }),
  sending: () => ({ tone: 'crash' }),
  sms_sent: (s) => ({ tone: 'ready', params: { attempt: s.attempt }, contact: true, retried: s.attempt > 1 }),
  sms_retrying: (s) => ({ tone: 'caution', params: { attempt: s.attempt }, contact: true }),
  dismissed: () => ({ tone: 'neutral' }),
  face_not_visible: () => ({ tone: 'caution' }),
  fault_logged: () => ({ tone: 'caution' }),
  resolved: () => ({ tone: 'ready' }),
  logged: () => ({ tone: 'neutral' }),
}

// What happened, step by step. The first step is the start; the others show the time since then (m:ss).
export default function Timeline({ event, contacts }) {
  const { t, i18n } = useTranslation('events')
  const steps = [...event.timeline].sort((a, b) => a.at - b.at).filter((step) => STEPS[step.kind])
  if (steps.length === 0) return null
  const start = steps[0].at
  const nameOf = (contactId) => contacts.find((contact) => contact.id === contactId)?.name ?? t('sms.unknownContact')

  return (
    <section className="evcard card" aria-labelledby="timeline-title">
      <h2 id="timeline-title" className="evcard__title">{t('timeline.title')}</h2>
      <p className="evcard__sub">{t('timeline.started', { time: formatClock(start, i18n.language) })}</p>
      <ol className="timeline">
        {steps.map((step, index) => {
          const spec = STEPS[step.kind](step)
          const params = { ...spec.params, name: spec.contact ? nameOf(step.contactId) : undefined }
          return (
            <li key={`${step.kind}-${step.at}-${index}`} className={`timeline__item timeline__item--${spec.tone}`}>
              <span className="timeline__dot" aria-hidden="true" />
              <span className="timeline__text">
                <span className="timeline__title">{t(`step.${step.kind}`, params)}</span>
                {spec.retried && <span className="timeline__detail">{t('step.afterRetries', { attempt: step.attempt })}</span>}
              </span>
              <span className="timeline__time">{index === 0 ? t('timeline.start') : `+${formatElapsed(step.at - start)}`}</span>
            </li>
          )
        })}
        {event.open && (
          <li className="timeline__item timeline__item--live">
            <span className="timeline__dot" aria-hidden="true" />
            <span className="timeline__text"><span className="timeline__title">{t('timeline.waiting')}</span></span>
          </li>
        )}
      </ol>
    </section>
  )
}
