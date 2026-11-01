import { latency } from '../lib/latency'
import { createSeed } from '../sim/seed'
import { selectAccountByEmail, selectInviteByCode } from './selectors'

// The only way screens change data. Swapping these for API calls is what going live means.
export function createActions(store, engine) {
  const { dispatch, getState } = store
  return {
    // Accounts and session. Every call that would hit a server waits a moment first.
    async signIn({ email, password }) {
      await latency()
      const account = selectAccountByEmail(getState(), email)
      if (!account || account.password !== password) return { ok: false, error: 'invalidLogin' }
      dispatch({ type: 'session/start', accountId: account.id })
      return { ok: true }
    },
    async signUp({ name, email, password, language }) {
      await latency()
      if (selectAccountByEmail(getState(), email)) return { ok: false, error: 'emailTaken' }
      const account = { id: `acc_${Date.now().toString(36)}`, role: 'driver', name: name.trim(), email: email.trim().toLowerCase(), password, language }
      dispatch({ type: 'account/add', account })
      dispatch({ type: 'session/start', accountId: account.id })
      return { ok: true }
    },
    signOut: () => dispatch({ type: 'session/end' }),
    // Used by the gear to change who is signed in without a password.
    switchAccount: (accountId) => dispatch({ type: 'session/start', accountId }),
    // Always answers the same way, so nobody can find out which emails have accounts.
    async requestPasswordCode() {
      await latency()
      return { ok: true }
    },
    async updateProfile({ name, email }) {
      await latency()
      const state = getState()
      const taken = selectAccountByEmail(state, email)
      if (taken && taken.id !== state.session.accountId) return { ok: false, error: 'emailTaken' }
      dispatch({ type: 'account/patch', id: state.session.accountId, patch: { name: name.trim(), email: email.trim().toLowerCase() } })
      return { ok: true }
    },
    async checkInviteCode(code) {
      await latency()
      const invite = selectInviteByCode(getState(), code)
      if (!invite) return { ok: false, error: 'codeNotFound' }
      if (invite.status !== 'invited') return { ok: false, error: 'codeUsed' }
      return { ok: true, code: invite.code }
    },
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
