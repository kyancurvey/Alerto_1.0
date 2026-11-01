import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './components/layout/AppShell'
import { ToastProvider } from './components/ui'
import PresenterGear from './components/presenter/PresenterGear'
import { StoreProvider } from './store/StoreProvider'
import HomePage from './features/home/HomePage'
import EventsPage from './features/events/EventsPage'
import MapPage from './features/map/MapPage'
import VehiclesPage from './features/vehicles/VehiclesPage'
import MorePage from './features/more/MorePage'
import PeoplePage from './features/people/PeoplePage'
import ReportsPage from './features/reports/ReportsPage'
import SettingsPage from './features/settings/SettingsPage'
import AdminPage from './features/admin/AdminPage'
import { nav } from './routes'

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <HashRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to={nav.home.to} replace />} />
              <Route path={nav.home.to} element={<HomePage />} />
              <Route path={nav.events.to} element={<EventsPage />} />
              <Route path={nav.map.to} element={<MapPage />} />
              <Route path={nav.vehicles.to} element={<VehiclesPage />} />
              <Route path={nav.more.to} element={<MorePage />} />
              <Route path={nav.people.to} element={<PeoplePage />} />
              <Route path={nav.reports.to} element={<ReportsPage />} />
              <Route path={nav.settings.to} element={<SettingsPage />} />
              <Route path={nav.admin.to} element={<AdminPage />} />
              <Route path="*" element={<Navigate to={nav.home.to} replace />} />
            </Route>
          </Routes>
        </HashRouter>
        <PresenterGear />
      </ToastProvider>
    </StoreProvider>
  )
}
