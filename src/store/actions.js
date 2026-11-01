import { createSeed } from '../sim/seed'

// The only way screens change data. Swapping these for API calls is what going live means.
export function createActions(store, engine) {
  const { dispatch, getState } = store
  return {
    setLanguage: (language) => dispatch({ type: 'app/language', language }),
    setTiming: (timing) => dispatch({ type: 'app/timing', timing }),
    setActiveVehicle: (vehicleId) => dispatch({ type: 'app/activeVehicle', vehicleId }),
    runScenario: (scenarioId) => engine.run(scenarioId),
    // Back to the starting data and signed out. The timing choice stays.
    resetData() {
      engine.stop()
      dispatch({ type: 'reset', state: { ...createSeed(Date.now()), timing: getState().timing } })
    },
  }
}
