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
