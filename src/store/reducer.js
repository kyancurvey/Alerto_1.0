// Pure state transitions. Components never call this directly: they use the actions.
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
    case 'session/start': {
      const account = state.accounts.find((item) => item.id === action.accountId)
      return account ? { ...state, session: { accountId: account.id }, language: account.language } : state
    }
    case 'session/end':
      return { ...state, session: { accountId: null } }
    case 'account/add':
      return { ...state, accounts: [...state.accounts, action.account] }
    case 'account/patch':
      return { ...state, accounts: patchById(state.accounts, action.id, (account) => ({ ...account, ...action.patch })) }

    case 'app/timing':
      return { ...state, timing: action.timing }
    case 'app/activeVehicle':
      return { ...state, activeVehicleId: action.vehicleId }

    // Keeps "last seen" fresh for units that are online.
    case 'heartbeat':
      return {
        ...state,
        units: state.units.map((unit) =>
          unit.status.presence === 'online' ? { ...unit, status: { ...unit.status, lastSeen: action.now, updatedAt: action.now } } : unit),
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
