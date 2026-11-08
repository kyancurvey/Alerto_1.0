import { createRng } from './prng'
import { ops, scenarios } from './scenarios'

export const QUICK_SPEED = 3
const HEARTBEAT_MS = 5000

// Runs scenario steps one after another. The run lives in the store (state.run), so it survives a reload:
// when the app opens with a run still in progress, the remaining steps are applied at once.
export function createEngine({ getState, dispatch }) {
  let timer = null
  let waiters = []

  const speed = () => (getState().timing === 'quick' ? QUICK_SPEED : 1)

  function finish() {
    dispatch({ type: 'run/clear' })
    const done = waiters
    waiters = []
    done.forEach((resolve) => resolve())
  }

  function execute() {
    const run = getState().run
    if (!run) return
    const current = run.steps[run.next]
    const inserted = []
    const ctx = { ...run.ctx }
    // Unit time since the run started: the scenario's own waits added up, whatever speed the run is shown at.
    const unitMs = run.steps.slice(0, run.next + 1).reduce((sum, item) => sum + item.wait, 0)
    ops[current.op](
      { getState, dispatch, ctx, rng: createRng(run.seed + run.next), now: Date.now(), unitMs, speed: speed(), vehicleId: run.vehicleId, insert: (steps) => inserted.push(...steps) },
      current.args ?? {},
    )
    dispatch({ type: 'run/advance', insert: inserted, ctx })
    const after = getState().run
    if (after.next >= after.steps.length) finish()
  }

  function schedule() {
    const run = getState().run
    if (!run) return
    timer = setTimeout(() => {
      timer = null
      execute()
      schedule()
    }, run.steps[run.next].wait / speed())
  }

  // Apply whatever is left of the current run immediately.
  function settle() {
    clearTimeout(timer)
    timer = null
    while (getState().run) execute()
  }

  return {
    run(scenarioId) {
      const scenario = scenarios.find((item) => item.id === scenarioId)
      if (!scenario) return Promise.resolve()
      settle()
      const state = getState()
      const vehicleId = state.activeVehicleId
      const seed = Date.now()
      dispatch({ type: 'run/set', run: { scenarioId, vehicleId, seed, steps: scenario.build(state, vehicleId), next: 0, ctx: {} } })
      const done = new Promise((resolve) => waiters.push(resolve))
      schedule()
      return done
    },
    settle,
    // Drop timers without finishing (the data is being replaced).
    stop() {
      clearTimeout(timer)
      timer = null
      const done = waiters
      waiters = []
      done.forEach((resolve) => resolve())
    },
    startHeartbeat() {
      const id = setInterval(() => dispatch({ type: 'heartbeat', now: Date.now() }), HEARTBEAT_MS)
      return () => clearInterval(id)
    },
  }
}
