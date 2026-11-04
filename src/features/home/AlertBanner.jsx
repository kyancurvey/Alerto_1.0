import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { MapPin, Siren, TriangleAlert } from 'lucide-react'
import { Card } from '../../components/ui'
import { formatElapsed } from '../../lib/time'
import useNow from '../../lib/useNow'
import { pathOf } from '../../routes'

// The banner for an active drowsiness alert, Levels 1 to 3 (amber, red, red with a pulsing ring).
export default function AlertBanner({ alert, vehicle, showVehicle, showMap }) {
  const { t } = useTranslation('home')
  const now = useNow(1000)
  const Icon = alert.level === 1 ? TriangleAlert : Siren

  return (
    <Card as="section" className={`alertbar alertbar--l${alert.level}`} role="alert">
      <span className="alertbar__icon"><Icon size={26} aria-hidden="true" /></span>
      <div className="alertbar__text">
        <h2 className="alertbar__title">{t(`alert.level${alert.level}`)}</h2>
        <p>{t('alert.detail')}{showVehicle ? ` · ${vehicle.name}` : ''}</p>
        <p className="alertbar__time">{t('alert.active', { time: formatElapsed(now - alert.startedAt) })}</p>
      </div>
      {showMap && (
        <Link to={pathOf('map')} className="btn btn--outline alertbar__map">
          <MapPin size={20} aria-hidden="true" />{t('alert.map')}
        </Link>
      )}
    </Card>
  )
}
