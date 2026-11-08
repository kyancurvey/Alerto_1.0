import { useTranslation } from 'react-i18next'
import Page from '../../components/layout/Page'
import { Skeleton, Tabs } from '../../components/ui'
import { can } from '../../lib/permissions'
import useFirstLoad from '../../lib/useFirstLoad'
import { useStore } from '../../store/StoreProvider'
import useSession from '../../store/useSession'
import { selectHomeSubjects } from '../../store/selectors'
import ContactsSection from './ContactsSection'
import FamilySection from './FamilySection'
import FamilyView from './FamilyView'
import './people.css'

// Contacts and Family. A driver manages the contacts of each vehicle and the family; a family member sees the read-only version.
export default function PeoplePage() {
  const { t } = useTranslation('people')
  const { state, actions } = useStore()
  const { account, role, vehicles } = useSession()
  const ready = useFirstLoad('people')

  if (!ready) {
    return (
      <div className="page" role="status" aria-label={t('loading')}>
        <Skeleton height="48px" />
        <Skeleton height="220px" />
        <Skeleton height="180px" />
      </div>
    )
  }

  if (!can(role, 'manageContacts')) {
    return (
      <Page title={t('title')}>
        <FamilyView subjects={selectHomeSubjects(state, account, true)} />
      </Page>
    )
  }

  const selected = vehicles.find((vehicle) => vehicle.id === state.activeVehicleId) ?? vehicles[0]
  return (
    <Page title={t('title')}>
      {vehicles.length > 1 && (
        <div className="people__tabs">
          <Tabs label={t('vehicleSwitch')} items={vehicles.map((vehicle) => ({ id: vehicle.id, label: vehicle.name }))} value={selected.id} onChange={actions.setActiveVehicle} />
        </div>
      )}
      <ContactsSection key={selected.id} vehicle={selected} />
      <FamilySection driverId={account.id} />
    </Page>
  )
}
