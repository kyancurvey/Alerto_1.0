import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { canOpen, needsSetup } from '../../lib/permissions'
import { pathOf, paths, routeKeyOf } from '../../routes'
import useSession from '../../store/useSession'

// Signed-out visitors only get the sign-in, sign-up and join screens.
export function PublicOnly() {
  const { account, landing } = useSession()
  return account ? <Navigate to={pathOf(landing)} replace /> : <Outlet />
}

// Everything else needs a session, and each role only opens its own pages.
export function RequireSession() {
  const { account, role, hasVehicle, landing } = useSession()
  const { pathname } = useLocation()
  if (!account) return <Navigate to={paths.signin} replace />

  const key = routeKeyOf(pathname)
  const target = pathOf(landing)
  const allowed = key === 'setup' ? needsSetup(role, hasVehicle) : !needsSetup(role, hasVehicle) && canOpen(role, key)
  return allowed ? <Outlet /> : <Navigate to={target} replace />
}

export function RootRedirect() {
  const { account, landing } = useSession()
  return <Navigate to={account ? pathOf(landing) : paths.signin} replace />
}
