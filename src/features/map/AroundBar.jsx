import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { Button, Card } from '../../components/ui'
import { TRAIL_MINUTES } from '../../lib/trail'

const MIN_MS = 60 * 1000

// Shown above the map while it displays the minutes around one alert.
export default function AroundBar({ event, now, onBack }) {
  const { t } = useTranslation('map')
  const recent = now < event.time + TRAIL_MINUTES * MIN_MS

  return (
    <Card as="section" className="around" aria-labelledby="around-title">
      <div className="around__head">
        <div>
          <h2 id="around-title" className="around__title">{t('around.title')}</h2>
          <p className="around__detail">{t('around.detail')}</p>
        </div>
        <Button variant="outline" onClick={onBack}><ArrowLeft size={20} aria-hidden="true" />{t('around.back')}</Button>
      </div>
      <ul className="maplegend" aria-label={t('around.numbers')}>
        <li className="maplegend__item"><span className="maplegend__swatch maplegend__swatch--before" aria-hidden="true" />{t('around.before')}</li>
        <li className="maplegend__item"><span className="maplegend__swatch maplegend__swatch--after" aria-hidden="true" />{t('around.after')}</li>
      </ul>
      <p className="around__detail">{t('around.numbers')}{recent ? ` ${t('around.partial')}` : ''}</p>
    </Card>
  )
}
