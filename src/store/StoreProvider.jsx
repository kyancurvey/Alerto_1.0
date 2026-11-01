import { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import i18n from '../i18n'
import { createEngine } from '../sim/engine'
import { createSeed } from '../sim/seed'
import { createActions } from './actions'
import { loadPersisted, savePersisted } from './persist'
import { createStore } from './store'

const StoreContext = createContext(null)
const SAVE_DELAY_MS = 200

export function StoreProvider({ children }) {
  const [core] = useState(() => {
    const store = createStore(loadPersisted() ?? createSeed())
    const engine = createEngine(store)
    return { store, engine, actions: createActions(store, engine) }
  })
  const state = useSyncExternalStore(core.store.subscribe, core.store.getState)

  useEffect(() => {
    const { store, engine } = core
    // A run that was in progress when the page closed is finished now, and online units count as seen just now.
    engine.settle()
    store.dispatch({ type: 'heartbeat', now: Date.now() })
    const stopHeartbeat = engine.startHeartbeat()

    let timer = null
    const flush = () => {
      clearTimeout(timer)
      timer = null
      savePersisted(store.getState())
    }
    const unsubscribe = store.subscribe(() => {
      if (timer === null) timer = setTimeout(flush, SAVE_DELAY_MS)
    })
    flush()
    window.addEventListener('pagehide', flush)

    return () => {
      window.removeEventListener('pagehide', flush)
      unsubscribe()
      clearTimeout(timer)
      stopHeartbeat()
      engine.stop()
    }
  }, [core])

  // The language lives in the store; i18next follows it.
  useEffect(() => {
    if (i18n.language !== state.language) i18n.changeLanguage(state.language)
  }, [state.language])

  const value = useMemo(() => ({ state, actions: core.actions, getState: core.store.getState }), [state, core])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore must be used inside StoreProvider')
  return context
}
