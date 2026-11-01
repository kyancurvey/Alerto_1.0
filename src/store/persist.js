// One versioned localStorage key. Every access is wrapped: private windows and blocked storage must not break the app.
export const STORAGE_KEY = 'alerto.v1'
export const SCHEMA_VERSION = 1

const LISTS = ['accounts', 'vehicles', 'units', 'contacts', 'familyLinks', 'settingsVersions', 'events', 'notifications', 'auditLog']

export function loadPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw)
    if (saved?.version !== SCHEMA_VERSION || !saved.state) return null
    const state = saved.state
    if (state.meta?.schema !== SCHEMA_VERSION || LISTS.some((key) => !Array.isArray(state[key]))) return null
    return state
  } catch {
    return null
  }
}

export function savePersisted(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, state }))
  } catch {
    // Storage full or blocked: the app keeps working from memory.
  }
}
