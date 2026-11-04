import { useTranslation } from 'react-i18next'
import { House } from 'lucide-react'
import Page from '../../components/layout/Page'
import { Avatar, EmptyState, Tabs } from '../../components/ui'
import { can } from '../../lib/permissions'
import { useStore } from '../../store/StoreProvider'
import useSession from '../../store/useSession'
import { selectAlertsOf, selectContacts, selectHomeSubjects, selectRecentCrash, selectTodayCounts, selectUnitOfVehicle } from '../../store/selectors'
import AlertBanner from './AlertBanner'
import CrashCard from './CrashCard'
import QuickActions from './QuickActions'
import TodayCounts from './TodayCounts'
import UnitCard from './UnitCard'
import './home.css'

// One driver's part of Home: alerts and crash first, then the unit, today's counts and (for the driver) the quick actions.
// What a family member sees depends on what the driver shares.
function Subject({ subject, quickActions }) {
  const { t } = useTranslation('home')
  const { state, actions } = useStore()
  const { vehicles, share } = subject
  const ids = vehicles.map((vehicle) => vehicle.id)
  const selected = vehicles.find((vehicle) => vehicle.id === state.activeVehicleId) ?? vehicles[0]
  const unit = selectUnitOfVehicle(state, selected.id)
  const vehicleOf = (id) => vehicles.find((vehicle) => vehicle.id === id)
  const showVehicle = vehicles.length > 1

  const alerts = share.alerts ? selectAlertsOf(state, ids) : []
  const crashAlerts = alerts.filter((alert) => alert.kind === 'crash')
  const drowsyAlerts = alerts.filter((alert) => alert.kind === 'drowsiness')
  const recentCrash = share.alerts && crashAlerts.length === 0 ? selectRecentCrash(state, ids, Date.now()) : null
  const selectedAlert = selectAlertsOf(state, [selected.id])[0]
  const sharesNothing = !share.alerts && !share.status

  return (
    <section className="home__subject" aria-label={subject.linked ? subject.name : undefined}>
      {subject.linked && (
        <header className="home__who">
          <Avatar name={subject.name} />
          <div>
            <h2 className="home__who-name">{subject.name}</h2>
            <p className="home__who-role">{t('subject.driver')}</p>
          </div>
        </header>
      )}

      {showVehicle && (
        <Tabs
          label={t('vehicleSwitch')}
          items={vehicles.map((vehicle) => ({ id: vehicle.id, label: vehicle.name }))}
          value={selected.id}
          onChange={actions.setActiveVehicle}
        />
      )}

      {crashAlerts.map((alert) => (
        <CrashCard
          key={alert.id}
          alert={alert}
          event={state.events.find((event) => event.id === alert.eventId)}
          contacts={selectContacts(state, alert.vehicleId)}
          vehicle={vehicleOf(alert.vehicleId)}
          showVehicle={showVehicle}
          showMap={share.map}
        />
      ))}
      {drowsyAlerts.map((alert) => (
        <AlertBanner key={alert.id} alert={alert} vehicle={vehicleOf(alert.vehicleId)} showVehicle={showVehicle} showMap={share.map} />
      ))}
      {recentCrash && (
        <CrashCard
          key={recentCrash.id}
          event={recentCrash}
          contacts={selectContacts(state, recentCrash.vehicleId)}
          vehicle={vehicleOf(recentCrash.vehicleId)}
          showVehicle={showVehicle}
          showMap={share.map}
        />
      )}

      {share.status && <UnitCard vehicle={selected} unit={unit} alert={selectedAlert} latestFirmware={state.meta.latestFirmware} />}
      {share.alerts && <TodayCounts counts={selectTodayCounts(state, selected.id, Date.now())} vehicleId={selected.id} />}
      {quickActions && <QuickActions vehicle={selected} unit={unit} alerting={Boolean(selectedAlert)} />}
      {sharesNothing && <EmptyState icon={House} title={t('shared.nothingTitle')} description={t('shared.nothingDetail', { name: subject.name })} />}
    </section>
  )
}

export default function HomePage() {
  const { t } = useTranslation('home')
  const { state } = useStore()
  const { account, role } = useSession()
  const linked = can(role, 'followLinkedDrivers')
  const subjects = selectHomeSubjects(state, account, linked)

  return (
    <Page title={t('title')}>
      {subjects.length === 0 && <EmptyState icon={House} title={t('empty.title')} description={t('empty.detail')} />}
      {subjects.map((subject) => (
        <Subject key={subject.id} subject={subject} quickActions={can(role, 'testAlarm')} />
      ))}
    </Page>
  )
}
