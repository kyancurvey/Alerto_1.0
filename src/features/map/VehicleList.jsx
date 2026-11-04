import { useTranslation } from 'react-i18next'
import { Badge, Card } from '../../components/ui'
import { placeText } from '../../components/map/placeText'
import { useStore } from '../../store/StoreProvider'
import { selectUnitOfVehicle } from '../../store/selectors'

// Every vehicle on the map as a list: a way to pick one without tapping the drawing.
export default function VehicleList({ vehicles, selectedId, onChoose, showOwner }) {
  const { t } = useTranslation('map')
  const { state } = useStore()

  return (
    <Card as="section" className="vehlist" aria-labelledby="vehlist-title">
      <h2 id="vehlist-title" className="vehlist__title">{t('vehicles.title')}</h2>
      <ul className="vehlist__items">
        {vehicles.map((vehicle) => {
          const status = selectUnitOfVehicle(state, vehicle.id)?.status
          const selected = selectedId === `v:${vehicle.id}`
          return (
            <li key={vehicle.id}>
              <button type="button" className={['vehlist__row', selected && 'vehlist__row--selected'].filter(Boolean).join(' ')} aria-pressed={selected} onClick={() => onChoose(vehicle)}>
                <span className="vehlist__text">
                  <span className="vehlist__name">{vehicle.name}</span>
                  <span className="vehlist__meta">
                    {vehicle.plate}{showOwner ? ` · ${vehicle.ownerName}` : ''}{status?.position ? ` · ${placeText(t, status.position.s)}` : ''}
                  </span>
                </span>
                {status && <Badge variant={status.presence === 'online' ? 'ready' : 'neutral'}>{t(`unit.presence.${status.presence}`, { ns: 'home' })}</Badge>}
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
