import { landingFor } from '../lib/permissions'
import { selectAccount, selectVisibleVehicles } from './selectors'
import { useStore } from './StoreProvider'

// Who is signed in, what they can see, and where they start.
export default function useSession() {
  const { state } = useStore()
  const account = selectAccount(state)
  const role = account?.role ?? null
  const vehicles = selectVisibleVehicles(state, account)
  const hasVehicle = vehicles.length > 0
  return { account, role, vehicles, hasVehicle, landing: role ? landingFor(role, { hasVehicle }) : null }
}
