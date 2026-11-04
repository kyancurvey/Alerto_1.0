// Pure state transitions. Components never call this directly: they use the actions.
import { EMPTY_SETUP } from '../lib/setup'
import { advanceAlong } from '../lib/route'
import { selectUnitMoves, selectVisibleVehicles } from './selectors'

// A unit that was not heard from for a while (a reload, a sleeping phone) moves one step, not the whole gap.
const MAX_MOVE_MS = 6000

const patchById = (list, id, fn) => list.map((item) => (item.id === id ? fn(item) : item))

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
    case 'heartbeat':
      return {
        ...state,
        units: state.units.map((unit) => {
          if (unit.status.presence !== 'online') return unit
          const elapsed = Math.min(Math.max(action.now - (unit.status.updatedAt ?? action.now), 0), MAX_MOVE_MS)
          const position = selectUnitMoves(state, unit, action.now) ? advanceAlong(unit.status.position, elapsed) : unit.status.position
          return { ...unit, status: { ...unit.status, lastSeen: action.now, updatedAt: action.now, position } }
        }),
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

    default:
      return state
  }
}
