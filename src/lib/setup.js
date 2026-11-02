// First-time setup: the steps in order, the choices for how a person is related to the driver,
// and the empty draft. The draft is kept in the store (state.setup) until the driver finishes.
export const SETUP_STEPS = ['vehicle', 'unit', 'contacts', 'invite', 'tests', 'install']

export const RELATIONS = ['spouse', 'parent', 'son', 'daughter', 'brother', 'sister', 'relative', 'neighbor', 'friend', 'other']

export const EMPTY_SETUP = Object.freeze({
  step: SETUP_STEPS[0],
  vehicle: null,
  unit: null,
  contacts: [],
  invite: null,
  tests: { sms: null, alarm: null },
})
