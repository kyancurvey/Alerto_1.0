import { useTranslation } from 'react-i18next'
import { Card } from '../../components/ui'

const TILES = [
  { key: 'drowsiness', tone: 'caution' },
  { key: 'crash', tone: 'crash' },
  { key: 'cancelled', tone: 'neutral' },
]

export default function TodayCounts({ counts, vehicleId }) {
  const { t } = useTranslation('home')
  return (
    <Card as="section" className="counts" aria-labelledby={`counts-${vehicleId}`}>
      <h2 id={`counts-${vehicleId}`} className="counts__title">{t('counts.title')}</h2>
      <ul className="counts__tiles">
        {TILES.map(({ key, tone }) => (
          <li key={key} className={`counts__tile counts__tile--${counts[key] > 0 ? tone : 'zero'}`}>
            <span className="counts__number">{counts[key]}</span>
            <span className="counts__label">{t(`counts.${key}`)}</span>
          </li>
        ))}
      </ul>
      {counts.late > 0 && <p className="counts__late">{t('counts.late', { count: counts.late })}</p>}
    </Card>
  )
}
