import { HashRouter, Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import { ToastProvider } from './components/ui'
import PushLayer from './components/alerts/PushLayer'
import PresenterGear from './components/presenter/PresenterGear'
import { StoreProvider } from './store/StoreProvider'
import HomePage from './features/home/HomePage'
import EventsPage from './features/events/EventsPage'
import EventDetailPage from './features/events/EventDetailPage'
import MapPage from './features/map/MapPage'
import VehiclesPage from './features/vehicles/VehiclesPage'
import AddVehiclePage from './features/vehicles/AddVehiclePage'
import VehicleDetailPage from './features/vehicles/VehicleDetailPage'
import MorePage from './features/more/MorePage'
import PeoplePage from './features/people/PeoplePage'
import ReportsPage from './features/reports/ReportsPage'
import SettingsPage from './features/settings/SettingsPage'
import AdminPage from './features/admin/AdminPage'
import { nav, paths } from './routes'
import { PublicOnly, RequireSession, RootRedirect } from './features/auth/guards'
import SignInPage from './features/auth/SignInPage'
import SignUpPage from './features/auth/SignUpPage'
import JoinPage from './features/auth/JoinPage'
import JoinInvitePage from './features/auth/JoinInvitePage'
import SetupPage from './features/setup/SetupPage'

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route element={<PublicOnly />}>
              <Route path={paths.signin} element={<SignInPage />} />
              <Route path={paths.signup} element={<SignUpPage />} />
              <Route path={paths.join} element={<JoinPage />} />
              <Route path={`${paths.join}/:code`} element={<JoinInvitePage />} />
            </Route>
            <Route element={<RequireSession />}>
              <Route path={paths.setup} element={<SetupPage />} />
              <Route element={<AppShell />}>
                <Route path={nav.home.to} element={<HomePage />} />
                <Route path={nav.events.to} element={<EventsPage />} />
                <Route path={`${nav.events.to}/:eventId`} element={<EventDetailPage />} />
                <Route path={nav.map.to} element={<MapPage />} />
                <Route path={nav.vehicles.to} element={<VehiclesPage />} />
                <Route path={`${nav.vehicles.to}/new`} element={<AddVehiclePage />} />
                <Route path={`${nav.vehicles.to}/:vehicleId`} element={<VehicleDetailPage />} />
                <Route path={nav.more.to} element={<MorePage />} />
                <Route path={nav.people.to} element={<PeoplePage />} />
                <Route path={nav.reports.to} element={<ReportsPage />} />
                <Route path={nav.settings.to} element={<SettingsPage />} />
                <Route path={nav.admin.to} element={<AdminPage />} />
              </Route>
            </Route>
            <Route path="*" element={<RootRedirect />} />
          </Routes>
          <PushLayer />
        </HashRouter>
        <PresenterGear />
      </ToastProvider>
    </StoreProvider>
  )
}
