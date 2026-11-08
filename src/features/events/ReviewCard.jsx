import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, RelativeTime, useToast } from '../../components/ui'
import { REVIEW_CHOICES } from '../../lib/events'
import { useStore } from '../../store/StoreProvider'

// The driver says whether an alert was real or a false alarm. It can be changed later.
export default function ReviewCard({ event }) {
  const { t } = useTranslation('events')
  const { state, actions } = useStore()
  const toast = useToast()
  const [busy, setBusy] = useState(null)

  const reviewer = event.reviewedBy ? state.accounts.find((account) => account.id === event.reviewedBy) : null

  const choose = async (review) => {
    if (review === event.review) return
    setBusy(review)
    const result = await actions.reviewEvent(event.id, review)
    setBusy(null)
    toast.show(result.ok ? t('review.saved') : t('follow.error'), result.ok ? 'success' : 'error')
  }

  return (
    <section className="evcard card" aria-labelledby="review-title">
      <h2 id="review-title" className="evcard__title">{t('review.title')}</h2>
      <p className="evcard__sub">
        {t(`review.status.${event.review}`, { defaultValue: t('review.status.unreviewed') })}
        {reviewer && event.reviewedAt ? <> · {reviewer.name} · <RelativeTime value={event.reviewedAt} /></> : null}
      </p>
      <div className="evreview">
        {REVIEW_CHOICES.map((choice) => (
          <Button
            key={choice}
            variant={event.review === choice ? 'primary' : 'outline'}
            aria-pressed={event.review === choice}
            loading={busy === choice}
            disabled={busy !== null}
            onClick={() => choose(choice)}
          >
            {t(`review.choice.${choice}`)}
          </Button>
        ))}
      </div>
    </section>
  )
}
