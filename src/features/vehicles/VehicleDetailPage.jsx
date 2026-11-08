import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Bus, Lock, TriangleAlert } from 'lucide-react'
import Page from '../../components/layout/Page'
import { Badge, Card, EmptyState, Skeleton } from '../../components/ui'
import { can } from '../../lib/permissions'
import useFirstLoad from '../../lib/useFirstLoad'
import { pathOf } from '../../routes'
import { useStore } from '../../store/StoreProvider'
import useSession from '../../store/useSession'
import { selectAlertsOf, selectContacts, selectVehicleAccess } from '../../store/selectors'
import QuickActions from '../home/QuickActions'
import CalibrationCard from './CalibrationCard'
import SettingsCard from './SettingsCard'
import SoftwareCard from './SoftwareCard'
import UnitHealthCard from './UnitHealthCard'
import './vehicles.css'

const PRESENCE_VARIANT = { online: 'ready', parked: 'neutral', offline: 'neutral' }

function BackLink() {
  const { t } = useTranslation('vehicles')
  return (
    <Link to={pathOf('vehicles')} className="btn btn--ghost vdetail__back">
      <ArrowLeft size={20} aria-hidden="true" />{t('back')}
    </Link>
  )
}

// One vehicle: unit health, settings, tests, mount calibration and software. A family member sees health and software, read-only.
export default function VehicleDetailPage() {
  const { t } = useTranslation('vehicles')
  const { vehicleId } = useParams()
  const { state } = useStore()
  const { account, role } = useSession()
  const ready = useFirstLoad('vehicles')
  const owner = can(role, 'changeVehicleSettings')
  const found = selectVehicleAccess(state, account, vehicleId)

  if (!ready) {
    return (
      <div className="page" role="status" aria-label={t('loading')}>
        <Skeleton height="48px" />
        <Skeleton height="120px" />
        <Skeleton height="260px" />
      </div>
    )
  }

  if (!found) {
    return (
      <Page title={t('title')}>
        <BackLink />
        <EmptyState icon={Bus} title={t('notFound.title')} description={t('notFound.detail')} />
      </Page>
    )
  }

  const { vehicle, unit, share } = found
  const alerting = selectAlertsOf(state, [vehicle.id]).length > 0
  const noContacts = owner && selectContacts(state, vehicle.id).length === 0

  return (
    <Page title={vehicle.name}>
      <BackLink />
      <Card className="vdetail__head">
        <div className="vdetail__row">
          <p className="vdetail__sub">{vehicle.plate} · {vehicle.route}</p>
          {share.status && <Badge variant={PRESENCE_VARIANT[unit.status.presence]}>{t(`presence.${unit.status.presence}`)}</Badge>}
        </div>
        <p className="vdetail__sub">{t('card.unit', { id: unit.id })}</p>
      </Card>

      {!share.status ? (
        <Card className="vehicles__locked">
          <Lock size={24} aria-hidden="true" />
          <div>
            <h2 className="vehicles__locked-title">{t('locked.title')}</h2>
            <p>{t('locked.detail', { name: vehicle.ownerName })}</p>
          </div>
        </Card>
      ) : (
        <>
          <UnitHealthCard vehicle={vehicle} unit={unit} />
          {noContacts && (
            <Card className="vdetail__warn" role="status">
              <TriangleAlert size={24} aria-hidden="true" />
              <div>
                <h2 className="vdetail__warn-title">{t('noContacts.title')}</h2>
                <p>{t('noContacts.detail')}</p>
                <Link to={pathOf('people')} className="btn btn--secondary">{t('noContacts.action')}</Link>
              </div>
            </Card>
          )}
          {owner && <SettingsCard key={vehicle.id} vehicle={vehicle} unit={unit} />}
          {owner && <QuickActions vehicle={vehicle} unit={unit} alerting={alerting} />}
          {owner && <CalibrationCard vehicle={vehicle} unit={unit} alerting={alerting} />}
          <SoftwareCard vehicle={vehicle} unit={unit} alerting={alerting} canUpdate={owner} />
        </>
      )}
    </Page>
  )
}
