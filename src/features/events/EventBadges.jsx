import { useTranslation } from 'react-i18next'
import { Badge } from '../../components/ui'
import { LEVEL_VARIANT, outcomeVariant } from '../../lib/events'

// The badges that say what an event is and how it ended. Used on list rows and on the detail page.
export default function EventBadges({ event }) {
  const { t } = useTranslation('events')
  const showOutcome = event.outcome && !(event.type === 'drowsiness' && event.outcome === 'cleared')
  return (
    <>
      {event.type === 'drowsiness' && <Badge variant={LEVEL_VARIANT[event.level]}>{t(`level.${event.level}`)}</Badge>}
      {event.open && <Badge variant="updating">{t('badge.inProgress')}</Badge>}
      {!event.open && showOutcome && <Badge variant={outcomeVariant(event.outcome)}>{t(`outcome.${event.outcome}`)}</Badge>}
      {event.receivedLate && <Badge>{t('badge.late')}</Badge>}
      {(event.review === 'real' || event.review === 'false_alarm') && (
        <Badge variant={event.review === 'real' ? 'crash' : 'neutral'}>{t(`review.${event.review}`)}</Badge>
      )}
      {event.type === 'crash_confirmed' && !event.open && event.review === 'unreviewed' && <Badge>{t('review.unreviewed')}</Badge>}
      {event.acks.length > 0 && <Badge variant="ready">{t('badge.acknowledged')}</Badge>}
    </>
  )
}
