// Pure state transitions. Components never call this directly: they use the actions.
import { EMPTY_SETUP } from '../lib/setup'
import { advanceAlong } from '../lib/route'
import { selectUnitMoves, selectVisibleVehicles } from './selectors'

// A unit that was not heard from for a while (a reload, a sleeping phone) moves one step, not the whole gap.
const MAX_MOVE_MS = 6000

const patchById = (list, id, fn) => list.map((item) => (item.id === id ? fn(item) : item))
// New audit entries go to the front: the log reads newest first.
const withAudit = (log, entries = []) => (entries.length ? [...entries, ...log] : log)
// A software update that has run its course: the unit now runs the new version.
const finishUpdate = (unit) => ({ ...unit, firmware: unit.update.to, update: null })

export function reducer(state, action) {
  switch (action.type) {
    case 'reset':
      return action.state

    // The language choice is stored on the signed-in account too.
    case 'app/language':
      return {
        ...state,
        language: action.language,
        accounts: state.session.accountId ? patchById(state.accounts, state.session.accountId, (account) => ({ ...account, language: action.language })) : state.accounts,
      }
    // The active vehicle follows the person: if the current one is not theirs, they start on their first one.
    case 'session/start': {
      const account = state.accounts.find((item) => item.id === action.accountId)
      if (!account) return state
      const visible = selectVisibleVehicles(state, account)
      const keep = visible.length === 0 || visible.some((vehicle) => vehicle.id === state.activeVehicleId)
      return { ...state, session: { accountId: account.id }, language: account.language, activeVehicleId: keep ? state.activeVehicleId : visible[0].id }
    }
    case 'session/end':
      return { ...state, session: { accountId: null } }
    case 'account/add':
      return { ...state, accounts: [...state.accounts, action.account] }
    case 'account/patch':
      return { ...state, accounts: patchById(state.accounts, action.id, (account) => ({ ...account, ...action.patch })) }

    // A family member accepts an invitation: the account is created and the link is marked accepted.
    case 'join/accept':
      return {
        ...state,
        accounts: [...state.accounts, action.account],
        familyLinks: patchById(state.familyLinks, action.linkId, (link) => ({
          ...link,
          memberId: action.account.id,
          email: action.account.email,
          status: 'accepted',
          acceptedAt: action.now,
        })),
      }

    // First-time setup draft, one per driver.
    case 'setup/patch':
      return { ...state, setup: { ...state.setup, [action.accountId]: { ...(state.setup?.[action.accountId] ?? EMPTY_SETUP), ...action.patch } } }
    // Finish: the vehicle, the claimed unit, contacts, settings and invite become real records in one step.
    case 'setup/finish':
      return {
        ...state,
        setup: Object.fromEntries(Object.entries(state.setup ?? {}).filter(([id]) => id !== action.accountId)),
        vehicles: [...state.vehicles, action.vehicle],
        units: patchById(state.units, action.vehicle.unitId, (unit) => ({ ...unit, vehicleId: action.vehicle.id, claimed: true })),
        contacts: [...state.contacts, ...action.contacts],
        familyLinks: action.link ? [...state.familyLinks, action.link] : state.familyLinks,
        settingsVersions: [...state.settingsVersions, action.settings],
        auditLog: [...action.audit, ...state.auditLog],
        activeVehicleId: action.vehicle.id,
      }

    case 'app/timing':
      return { ...state, timing: action.timing }
    case 'app/activeVehicle':
      return { ...state, activeVehicleId: action.vehicleId }

    // Keeps "last seen" fresh for units that are online, and moves the ones that report their position.
    // Settings waiting for a unit that can be reached are applied once their time has come, and finished updates land.
    case 'heartbeat': {
      const units = state.units.map((unit) => {
        let next = unit
        if (unit.status.presence === 'online') {
          const elapsed = Math.min(Math.max(action.now - (unit.status.updatedAt ?? action.now), 0), MAX_MOVE_MS)
          const position = selectUnitMoves(state, unit, action.now) ? advanceAlong(unit.status.position, elapsed) : unit.status.position
          next = { ...unit, status: { ...unit.status, lastSeen: action.now, updatedAt: action.now, position } }
        }
        return next.update && next.update.endsAt <= action.now ? finishUpdate(next) : next
      })
      const reachable = new Set(units.filter((unit) => unit.status.presence !== 'offline').map((unit) => unit.id))
      const due = (item) => item.status === 'pending' && (item.applyAt ?? 0) <= action.now && reachable.has(item.unitId)
      const settingsVersions = state.settingsVersions.some(due)
        ? state.settingsVersions.map((item) => (due(item) ? { ...item, status: 'applied', appliedAt: action.now } : item))
        : state.settingsVersions
      return { ...state, units, settingsVersions }
    }
    case 'unit/status':
      return { ...state, units: patchById(state.units, action.unitId, (unit) => ({ ...unit, status: { ...unit.status, ...action.patch } })) }
    case 'unit/health':
      return { ...state, units: patchById(state.units, action.unitId, (unit) => ({ ...unit, health: { ...unit.health, ...action.patch } })) }

    case 'alert/set': {
      const exists = state.alerts.some((alert) => alert.id === action.alert.id)
      return { ...state, alerts: exists ? patchById(state.alerts, action.alert.id, (alert) => ({ ...alert, ...action.alert })) : [...state.alerts, action.alert] }
    }
    case 'alert/end':
      return { ...state, alerts: state.alerts.filter((alert) => alert.id !== action.id) }

    case 'event/add':
      return { ...state, events: [action.event, ...state.events] }
    case 'event/patch':
      return { ...state, events: patchById(state.events, action.id, (event) => ({ ...event, ...action.patch })) }
    case 'event/timeline':
      return { ...state, events: patchById(state.events, action.id, (event) => ({ ...event, timeline: [...event.timeline, action.step] })) }
    case 'event/sms':
      return {
        ...state,
        events: patchById(state.events, action.id, (event) => ({
          ...event,
          sms: event.sms.map((entry) => (entry.contactId === action.contactId ? { ...entry, ...action.patch } : entry)),
        })),
      }

    // Events recorded by a unit that cannot reach the cloud wait here until it reconnects.
    case 'pending/add':
      return { ...state, pendingEvents: [...state.pendingEvents, action.event] }
    case 'pending/flush':
      return {
        ...state,
        pendingEvents: [],
        events: [...state.pendingEvents.map((event) => ({ ...event, receivedLate: true, receivedAt: action.now })), ...state.events].sort((a, b) => b.time - a.time),
      }

    case 'contact/delivery':
      return { ...state, contacts: patchById(state.contacts, action.contactId, (contact) => ({ ...contact, lastDelivery: action.delivery })) }
    case 'notification/add':
      return { ...state, notifications: [action.notification, ...state.notifications] }

    case 'run/set':
      return { ...state, run: action.run }
    case 'run/advance': {
      if (!state.run) return state
      const steps = [...state.run.steps]
      steps.splice(state.run.next + 1, 0, ...action.insert)
      return { ...state, run: { ...state.run, steps, next: state.run.next + 1, ctx: action.ctx } }
    }
    case 'run/clear':
      return { ...state, run: null }

    // ---------- Vehicles ----------
    // A driver adds a vehicle and claims its unit in one step. The unit starts reporting as soon as it is linked.
    case 'vehicle/add':
      return {
        ...state,
        vehicles: [...state.vehicles, action.vehicle],
        units: patchById(state.units, action.vehicle.unitId, (unit) => ({ ...unit, vehicleId: action.vehicle.id, claimed: true, status: { ...unit.status, ...action.status } })),
        settingsVersions: [...state.settingsVersions, action.settings],
        auditLog: withAudit(state.auditLog, action.audit),
      }
    // A settings change is a new version. It waits for the unit; an older version still waiting is replaced by it.
    case 'settings/add':
      return {
        ...state,
        settingsVersions: [
          ...state.settingsVersions.map((item) => (item.unitId === action.version.unitId && item.status === 'pending' ? { ...item, status: 'superseded' } : item)),
          action.version,
        ],
        auditLog: withAudit(state.auditLog, action.audit),
      }
    case 'settings/apply': {
      const version = state.settingsVersions.find((item) => item.id === action.id)
      const unit = version ? state.units.find((item) => item.id === version.unitId) : null
      if (!version || version.status !== 'pending' || !unit || unit.status.presence === 'offline') return state
      return { ...state, settingsVersions: patchById(state.settingsVersions, action.id, (item) => ({ ...item, status: 'applied', appliedAt: action.now })) }
    }
    case 'unit/calibration':
      return { ...state, units: patchById(state.units, action.unitId, (unit) => ({ ...unit, calibration: action.calibration })), auditLog: withAudit(state.auditLog, action.audit) }
    case 'unit/updateStart':
      return { ...state, units: patchById(state.units, action.unitId, (unit) => ({ ...unit, update: action.update })), auditLog: withAudit(state.auditLog, action.audit) }
    case 'unit/updateDone':
      return { ...state, units: patchById(state.units, action.unitId, (unit) => (unit.update && unit.update.endsAt === action.endsAt ? finishUpdate(unit) : unit)) }

    // ---------- Contacts ----------
    case 'contact/add':
      return { ...state, contacts: [...state.contacts, action.contact], auditLog: withAudit(state.auditLog, action.audit) }
    case 'contact/patch':
      return { ...state, contacts: patchById(state.contacts, action.id, (contact) => ({ ...contact, ...action.patch })), auditLog: withAudit(state.auditLog, action.audit) }
    // Removing a contact closes the gap in the order.
    case 'contact/remove': {
      const rest = state.contacts.filter((contact) => contact.id !== action.id)
      const order = rest.filter((contact) => contact.vehicleId === action.vehicleId).sort((a, b) => a.priority - b.priority).map((contact) => contact.id)
      return {
        ...state,
        contacts: rest.map((contact) => (contact.vehicleId === action.vehicleId ? { ...contact, priority: order.indexOf(contact.id) + 1 } : contact)),
        auditLog: withAudit(state.auditLog, action.audit),
      }
    }
    // `ids` is the whole list of the vehicle's contacts in the new order.
    case 'contact/order':
      return {
        ...state,
        contacts: state.contacts.map((contact) => (contact.vehicleId === action.vehicleId ? { ...contact, priority: action.ids.indexOf(contact.id) + 1 } : contact)),
        auditLog: withAudit(state.auditLog, action.audit),
      }

    // ---------- Family ----------
    case 'family/add':
      return { ...state, familyLinks: [...state.familyLinks, action.link], auditLog: withAudit(state.auditLog, action.audit) }
    case 'family/share':
      return { ...state, familyLinks: patchById(state.familyLinks, action.id, (link) => ({ ...link, share: action.share })), auditLog: withAudit(state.auditLog, action.audit) }
    // Removing access ends it at once: the link is gone, the person's alerts for this driver are withdrawn,
    // and a contact that used the app is no longer tied to an account (they are still texted).
    case 'family/remove': {
      const link = state.familyLinks.find((item) => item.id === action.id)
      if (!link) return state
      const vehicleIds = state.vehicles.filter((vehicle) => vehicle.ownerId === link.driverId).map((vehicle) => vehicle.id)
      const own = (vehicleId) => vehicleIds.includes(vehicleId)
      return {
        ...state,
        familyLinks: state.familyLinks.filter((item) => item.id !== link.id),
        contacts: link.memberId ? state.contacts.map((contact) => (contact.linkedAccountId === link.memberId && own(contact.vehicleId) ? { ...contact, linkedAccountId: null } : contact)) : state.contacts,
        notifications: link.memberId
          ? state.notifications.map((item) => (own(item.vehicleId) && item.recipients.includes(link.memberId) ? { ...item, recipients: item.recipients.filter((id) => id !== link.memberId) } : item))
          : state.notifications,
        auditLog: withAudit(state.auditLog, action.audit),
      }
    }

    default:
      return state
  }
}
