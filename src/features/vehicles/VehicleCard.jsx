import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react'
import { Badge, Card } from '../../components/ui'
import { healthIssues } from '../../lib/unitHealth'
import { pathOf } from '../../routes'
import { useStore } from '../../store/StoreProvider'
import { selectContacts, selectSettingsStatus, selectUnitOfVehicle, selectUpdate } from '../../store/selectors'

const PRESENCE_VARIANT = { online: 'ready', parked: 'neutral', offline: 'neutral' }

// One vehicle in the list: its unit and the things that need a look. `owner` adds what only the driver cares about.
export default function VehicleCard({ vehicle, owner }) {
  const { t } = useTranslation('vehicles')
  const { state } = useStore()
  const unit = selectUnitOfVehicle(state, vehicle.id)
  const { status } = unit
  const issues = healthIssues(unit)
  const update = selectUpdate(state, unit, Date.now())
  const pending = selectSettingsStatus(state, unit.id).pending
  const noContacts = owner && selectContacts(state, vehicle.id).length === 0

  return (
    <Card flush className="vcard">
      <Link to={`${pathOf('vehicles')}/${vehicle.id}`} className="vcard__link">
        <div className="vcard__text">
          <div className="vcard__head">
            <h3 className="vcard__name">{vehicle.name}</h3>
            <Badge variant={PRESENCE_VARIANT[status.presence]}>{t(`presence.${status.presence}`)}</Badge>
          </div>
          <p className="vcard__sub">{vehicle.plate} · {vehicle.route}</p>
          <p className="vcard__sub">{t('card.unit', { id: unit.id })} · {t('card.firmware', { version: unit.firmware })}</p>
          <div className="vcard__badges">
            {status.presence === 'offline' ? <Badge>{t('card.notReporting')}</Badge> : issues.length > 0 ? <Badge variant="caution">{t('card.needsAttention')}</Badge> : <Badge variant="ready">{t('card.healthOk')}</Badge>}
            {update.phase === 'available' && <Badge variant="updating">{t('card.updateAvailable')}</Badge>}
            {update.phase === 'updating' && <Badge variant="updating">{t('card.updating')}</Badge>}
            {owner && pending && <Badge variant="updating">{t('card.settingsPending')}</Badge>}
            {noContacts && <Badge variant="caution">{t('card.noContacts')}</Badge>}
          </div>
        </div>
        <ChevronRight size={20} aria-hidden="true" className="vcard__chevron" />
      </Link>
    </Card>
  )
}
