import { reducer } from './reducer'

// Minimal external store: state is read synchronously (the scenario engine needs that) and components subscribe to it.
export function createStore(initialState) {
  let state = initialState
  const listeners = new Set()
  return {
    getState: () => state,
    dispatch(action) {
      state = reducer(state, action)
      listeners.forEach((listener) => listener())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
