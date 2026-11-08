import { latency } from '../lib/latency'
import { can } from '../lib/permissions'
import { APPLY_MS, UPDATE_MS, changedSettingKeys, invalidSettings, pickSettings } from '../lib/unitSettings'
import { normalizePlate, normalizeUnitCode } from '../lib/validate'
import { QUICK_SPEED } from '../sim/engine'
import { DEFAULT_SETTINGS } from '../sim/seed'
import { newId } from './ids'
import { selectAccount, selectSettingsStatus, selectUnitOfVehicle, selectVehicle, unitReachable } from './selectors'

const entry = (account, action, target, detail = null, offset = 0) => ({ id: newId('aud'), time: Date.now() + offset, actorId: account.id, actorName: account.name, action, target, detail })

// Vehicle actions: add a vehicle, change its unit settings, calibrate the mount, update the software.
// Changes to a unit are not instant: they wait for the unit and then land (a few seconds in Quick timing).
export function createVehicleActions({ dispatch, getState }) {
  // The signed-in person and the vehicle, when the vehicle is theirs and they may change it.
  const control = (vehicleId, capability) => {
    const state = getState()
    const account = selectAccount(state)
    const vehicle = selectVehicle(state, vehicleId)
    if (!account || !vehicle || vehicle.ownerId !== account.id || !can(account.role, capability)) return null
    return { state, account, vehicle, unit: selectUnitOfVehicle(state, vehicleId) }
  }
  const delayOf = (state, ms) => (state.timing === 'quick' ? ms / QUICK_SPEED : ms)

  return {
    // Adds the vehicle and claims the unit in one step. The unit starts reporting as soon as it is linked.
    async addVehicle({ name, plate, route, code }) {
      await latency()
      const state = getState()
      const account = selectAccount(state)
      if (!account || !can(account.role, 'addVehicle') || !can(account.role, 'claimUnit')) return { ok: false, error: 'notAllowed' }
      const normalizedPlate = normalizePlate(plate)
      if (!normalizedPlate) return { ok: false, error: 'plateInvalid' }
      if (state.vehicles.some((vehicle) => vehicle.plate === normalizedPlate)) return { ok: false, error: 'plateTaken' }
      const normalizedCode = normalizeUnitCode(code)
      if (!normalizedCode) return { ok: false, error: 'codeFormat' }
      const unit = state.units.find((item) => item.pairingCode === normalizedCode)
      if (!unit) return { ok: false, error: 'unitNotFound' }
      if (unit.claimed) return { ok: false, error: 'unitClaimed' }
      const now = Date.now()
      const vehicle = { id: newId('veh'), name: name.trim(), plate: normalizedPlate, route: route.trim(), ownerId: account.id, ownerName: account.name, unitId: unit.id }
      const settings = { id: newId('set'), unitId: unit.id, version: 1, content: { ...DEFAULT_SETTINGS, language: account.language }, status: 'applied', createdAt: now, appliedAt: now }
      dispatch({
        type: 'vehicle/add',
        vehicle,
        settings,
        status: { presence: 'online', mode: 'ready', lastSeen: now, updatedAt: now, ignition: true, battery: 100, signal: 4, gps: 'good', faults: [], position: { s: 0.02 } },
        audit: [entry(account, 'unit_claimed', vehicle.name, { unitId: unit.id }, 1), entry(account, 'vehicle_added', vehicle.name, null, 0)],
      })
      return { ok: true, vehicleId: vehicle.id, unitId: unit.id }
    },

    // A settings change becomes a new version that waits for the unit ("pending"), then is applied.
    // Several changes made while one is waiting are kept: the new version starts from the waiting one.
    async changeUnitSettings(vehicleId, values) {
      await latency()
      const own = control(vehicleId, 'changeVehicleSettings')
      if (!own) return { ok: false, error: 'notAllowed' }
      const { state, account, vehicle, unit } = own
      const next = pickSettings(values)
      const invalid = invalidSettings(next)
      if (invalid.length > 0) return { ok: false, error: 'invalid', fields: invalid }
      const { applied, pending } = selectSettingsStatus(state, unit.id)
      const current = pending ?? applied
      if (!current) return { ok: false, error: 'notAllowed' }
      const base = pickSettings(current.content)
      const changed = changedSettingKeys(base, next)
      if (changed.length === 0) return { ok: true, unchanged: true }
      const now = Date.now()
      const version = {
        id: newId('set'),
        unitId: unit.id,
        version: Math.max(...state.settingsVersions.filter((item) => item.unitId === unit.id).map((item) => item.version)) + 1,
        content: { ...current.content, ...next },
        status: 'pending',
        createdAt: now,
        appliedAt: null,
        applyAt: now + delayOf(state, APPLY_MS),
      }
      dispatch({
        type: 'settings/add',
        version,
        audit: changed.map((key, index) => entry(account, 'setting_changed', vehicle.name, { key, from: base[key], to: next[key] }, index)),
      })
      // A unit that cannot be reached keeps the change waiting; the heartbeat applies it when the unit is back.
      setTimeout(() => dispatch({ type: 'settings/apply', id: version.id, now: Date.now() }), version.applyAt - now)
      return { ok: true, version: version.version }
    },

    // The unit has measured how it sits in the cab. It needs to be reachable and quiet.
    async calibrateUnit(vehicleId) {
      await latency()
      const own = control(vehicleId, 'changeVehicleSettings')
      if (!own) return { ok: false, error: 'notAllowed' }
      const { state, account, vehicle, unit } = own
      if (unit.status.presence !== 'online') return { ok: false, error: 'unitOffline' }
      if (state.alerts.some((alert) => alert.vehicleId === vehicleId)) return { ok: false, error: 'alertActive' }
      const at = Date.now()
      dispatch({ type: 'unit/calibration', unitId: unit.id, calibration: { state: 'calibrated', at }, audit: [entry(account, 'calibration_done', vehicle.name)] })
      return { ok: true }
    },

    // Starts installing the newest software. The unit must be parked with the ignition off, so the jeepney is not in service.
    async startUnitUpdate(vehicleId) {
      await latency()
      const own = control(vehicleId, 'changeVehicleSettings')
      if (!own) return { ok: false, error: 'notAllowed' }
      const { state, account, vehicle, unit } = own
      if (unit.update) return { ok: false, error: 'updating' }
      if (unit.firmware === state.meta.latestFirmware) return { ok: false, error: 'upToDate' }
      if (!unitReachable(unit)) return { ok: false, error: 'unitOffline' }
      if (unit.status.ignition) return { ok: false, error: 'ignitionOn' }
      if (state.alerts.some((alert) => alert.vehicleId === vehicleId)) return { ok: false, error: 'alertActive' }
      const startedAt = Date.now()
      const update = { to: state.meta.latestFirmware, startedAt, endsAt: startedAt + delayOf(state, UPDATE_MS) }
      dispatch({ type: 'unit/updateStart', unitId: unit.id, update, audit: [entry(account, 'unit_update_started', vehicle.name, { from: unit.firmware, to: update.to })] })
      setTimeout(() => dispatch({ type: 'unit/updateDone', unitId: unit.id, endsAt: update.endsAt }), update.endsAt - startedAt)
      return { ok: true }
    },
  }
}
