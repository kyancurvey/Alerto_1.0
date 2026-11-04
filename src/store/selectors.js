import { EMPTY_SETUP } from '../lib/setup'
import { manilaDayStart } from '../lib/time'

// Read helpers. Screens use these instead of digging through the state.
export const selectAccount = (state) => state.accounts.find((account) => account.id === state.session.accountId) ?? null
export const selectRole = (state) => selectAccount(state)?.role ?? null
export const selectAccountByEmail = (state, email) => {
  const wanted = String(email ?? '').trim().toLowerCase()
  return state.accounts.find((account) => account.email.toLowerCase() === wanted) ?? null
}

// Vehicles the account can see: a driver's own, the linked drivers' for a family member, all for an admin.
export function selectVisibleVehicles(state, account) {
  if (!account) return []
  if (account.role === 'admin') return state.vehicles
  if (account.role === 'driver') return state.vehicles.filter((vehicle) => vehicle.ownerId === account.id)
  const driverIds = state.familyLinks.filter((link) => link.memberId === account.id && link.status === 'accepted').map((link) => link.driverId)
  return state.vehicles.filter((vehicle) => driverIds.includes(vehicle.ownerId))
}

export const selectInviteByCode = (state, code) => {
  const wanted = String(code ?? '').trim().toUpperCase()
  return state.familyLinks.find((link) => link.code === wanted) ?? null
}

export const selectVehicle = (state, vehicleId) => state.vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null
export const selectActiveVehicle = (state) => selectVehicle(state, state.activeVehicleId)
export const selectUnit = (state, unitId) => state.units.find((unit) => unit.id === unitId) ?? null
export const selectUnitOfVehicle = (state, vehicleId) => state.units.find((unit) => unit.vehicleId === vehicleId) ?? null

// Contacts of a vehicle in priority order (the order the crash SMS goes out in).
export const selectContacts = (state, vehicleId) =>
  state.contacts.filter((contact) => contact.vehicleId === vehicleId).sort((a, b) => a.priority - b.priority)

// Latest applied settings for a unit.
export function selectSettings(state, unitId) {
  const applied = state.settingsVersions.filter((item) => item.unitId === unitId && item.status === 'applied')
  return applied.sort((a, b) => b.version - a.version)[0]?.content ?? null
}

// Who receives a notification: the driver, the family members who share the given thing, the admins.
export function selectRecipients(state, vehicleId, audiences, shareKey) {
  const vehicle = selectVehicle(state, vehicleId)
  const ids = new Set()
  if (audiences.includes('driver') && vehicle?.ownerId) ids.add(vehicle.ownerId)
  if (audiences.includes('family') && vehicle?.ownerId) {
    state.familyLinks
      .filter((link) => link.driverId === vehicle.ownerId && link.status === 'accepted' && link.memberId && link.share[shareKey])
      .forEach((link) => ids.add(link.memberId))
  }
  if (audiences.includes('admin')) state.accounts.filter((account) => account.role === 'admin').forEach((account) => ids.add(account.id))
  return [...ids]
}

// The first-time setup draft of a driver (nothing saved yet reads as the empty draft).
export const selectSetup = (state, accountId) => state.setup?.[accountId] ?? EMPTY_SETUP

// ---------- Home ----------
const FULL_SHARE = { alerts: true, map: true, status: true }
export const RECENT_CRASH_MS = 30 * 60 * 1000

// Who Home is about. A driver sees their own vehicles. A family member sees one entry per linked driver,
// with what that driver shares (alerts, map, status).
export function selectHomeSubjects(state, account, followsLinkedDrivers) {
  if (!account) return []
  if (!followsLinkedDrivers) {
    const vehicles = state.vehicles.filter((vehicle) => vehicle.ownerId === account.id)
    return vehicles.length ? [{ id: account.id, name: account.name, share: FULL_SHARE, vehicles, linked: false }] : []
  }
  return state.familyLinks
    .filter((link) => link.memberId === account.id && link.status === 'accepted')
    .map((link) => {
      const vehicles = state.vehicles.filter((vehicle) => vehicle.ownerId === link.driverId)
      const name = state.accounts.find((item) => item.id === link.driverId)?.name ?? vehicles[0]?.ownerName ?? ''
      return { id: link.driverId, name, share: link.share, vehicles, linked: true }
    })
    .filter((subject) => subject.vehicles.length > 0)
}

export const selectAlertsOf = (state, vehicleIds) => state.alerts.filter((alert) => vehicleIds.includes(alert.vehicleId))

// Today's counts for one vehicle (day in Asia/Manila): drowsiness alerts, crash alerts, cancelled alerts, and how many arrived late.
export function selectTodayCounts(state, vehicleId, now) {
  const start = manilaDayStart(now)
  const today = state.events.filter((event) => event.vehicleId === vehicleId && event.time >= start)
  return {
    drowsiness: today.filter((event) => event.type === 'drowsiness').length,
    crash: today.filter((event) => event.type === 'crash_confirmed').length,
    cancelled: today.filter((event) => event.type === 'crash_cancelled').length,
    late: today.filter((event) => event.receivedLate).length,
  }
}

// The latest crash that has ended in the last 30 minutes, so Home can show how it turned out.
export function selectRecentCrash(state, vehicleIds, now) {
  return (
    state.events
      .filter((event) => vehicleIds.includes(event.vehicleId) && !event.open && now - event.time < RECENT_CRASH_MS)
      .filter((event) => event.type === 'crash_confirmed' || event.type === 'crash_cancelled')
      .sort((a, b) => b.time - a.time)[0] ?? null
  )
}

// ---------- Map ----------
// Which vehicles the Map shows for this person, and whether alert pins may be shown for each.
// A driver sees their own, a family member the linked drivers' that share map position (pins also need shared alerts),
// the admin every unit. `locked` is true when a family member is linked but nothing is shared on the map.
export function selectMapAccess(state, account, { linked, all }) {
  const withPins = (vehicles, pins) => vehicles.map((vehicle) => ({ vehicle, pins }))
  if (!account) return { entries: [], locked: false, lockedName: null }
  if (all) return { entries: withPins(state.vehicles, true), locked: false, lockedName: null }
  if (!linked) return { entries: withPins(state.vehicles.filter((vehicle) => vehicle.ownerId === account.id), true), locked: false, lockedName: null }

  const links = state.familyLinks.filter((link) => link.memberId === account.id && link.status === 'accepted')
  const entries = links
    .filter((link) => link.share.map)
    .flatMap((link) => withPins(state.vehicles.filter((vehicle) => vehicle.ownerId === link.driverId), Boolean(link.share.alerts)))
  const hidden = links.find((link) => !link.share.map)
  const lockedName = hidden ? state.accounts.find((item) => item.id === hidden.driverId)?.name ?? null : null
  return { entries, locked: entries.length === 0 && Boolean(hidden), lockedName }
}

// Pins on the map: crash alerts, cancelled crash alerts and Level 3 (critical) drowsiness alerts.
export function pinKindOf(event) {
  if (event.type === 'crash_confirmed') return 'crash'
  if (event.type === 'crash_cancelled') return 'cancelled'
  if (event.type === 'drowsiness' && event.level === 3) return 'critical'
  return null
}

export const selectMapPins = (state, vehicleIds) =>
  state.events.filter((event) => vehicleIds.includes(event.vehicleId) && pinKindOf(event)).map((event) => ({ event, kind: pinKindOf(event) }))

// A unit that reports its position moves while it is online with the ignition on. It stays put during a crash
// countdown, while messages go out, and for 30 minutes after a confirmed crash.
export function selectUnitMoves(state, unit, now) {
  const { status } = unit
  if (status.presence !== 'online' || !status.ignition || !status.position) return false
  if (!selectSettings(state, unit.id)?.positionReports) return false
  if (status.mode === 'crashCountdown' || status.mode === 'crashSending') return false
  return !state.events.some((event) => event.vehicleId === unit.vehicleId && event.type === 'crash_confirmed' && now - event.time < RECENT_CRASH_MS)
}
