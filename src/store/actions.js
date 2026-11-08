import { REVIEW_CHOICES } from '../lib/events'
import { latency } from '../lib/latency'
import { can } from '../lib/permissions'
import { normalizePhone, normalizePlate, normalizeUnitCode } from '../lib/validate'
import { createSeed, DEFAULT_SETTINGS } from '../sim/seed'
import { selectAccount, selectAccountByEmail, selectContacts, selectInviteByCode, selectSetup } from './selectors'

export const NOTE_MAX = 300

let counter = 0
const newId = (prefix) => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`
const INVITE_CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

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
    // A family member joins with an invitation code. The email is checked first, the link is accepted on the next call.
    async checkNewEmail(email) {
      await latency()
      return selectAccountByEmail(getState(), email) ? { ok: false, error: 'emailTaken' } : { ok: true }
    },
    // Creates the family account and accepts the link to the driver. The person signs in afterwards.
    async joinWithInvite({ code, name, email, password, language }) {
      await latency()
      const state = getState()
      const invite = selectInviteByCode(state, code)
      if (!invite) return { ok: false, error: 'codeNotFound' }
      if (invite.status !== 'invited') return { ok: false, error: 'codeUsed' }
      if (selectAccountByEmail(state, email)) return { ok: false, error: 'emailTaken' }
      const account = { id: newId('acc'), role: 'family', name: name.trim(), email: email.trim().toLowerCase(), password, language }
      dispatch({ type: 'join/accept', account, linkId: invite.id, now: Date.now() })
      return { ok: true }
    },

    // ---------- First-time setup (the draft is kept until finishSetup) ----------
    setupStep(step) {
      const accountId = getState().session.accountId
      if (accountId) dispatch({ type: 'setup/patch', accountId, patch: { step } })
    },
    async saveSetupVehicle({ name, plate, route }) {
      await latency()
      const state = getState()
      const accountId = state.session.accountId
      const normalized = normalizePlate(plate)
      if (!accountId || !normalized) return { ok: false, error: 'plateInvalid' }
      if (state.vehicles.some((vehicle) => vehicle.plate === normalized)) return { ok: false, error: 'plateTaken' }
      dispatch({ type: 'setup/patch', accountId, patch: { vehicle: { name: name.trim(), plate: normalized, route: route.trim() } } })
      return { ok: true }
    },
    // What the camera would read from the QR code on the unit: the code of the unit waiting to be claimed.
    async scanUnitQr() {
      await latency()
      const unit = getState().units.find((item) => !item.claimed)
      return unit ? { ok: true, code: unit.pairingCode } : { ok: false, error: 'qrNotRead' }
    },
    // Claiming brings the unit online: it reports its readings as soon as it is linked.
    async claimSetupUnit(code) {
      await latency()
      const state = getState()
      const accountId = state.session.accountId
      const normalized = normalizeUnitCode(code)
      if (!normalized) return { ok: false, error: 'codeFormat' }
      const unit = state.units.find((item) => item.pairingCode === normalized)
      if (!unit) return { ok: false, error: 'unitNotFound' }
      if (unit.claimed) return { ok: false, error: 'unitClaimed' }
      const now = Date.now()
      dispatch({
        type: 'unit/status',
        unitId: unit.id,
        patch: { presence: 'online', mode: 'ready', lastSeen: now, updatedAt: now, ignition: true, battery: 100, signal: 4, gps: 'good', faults: [], position: { s: 0.02 } },
      })
      dispatch({ type: 'setup/patch', accountId, patch: { unit: { id: unit.id, code: normalized } } })
      return { ok: true, unitId: unit.id }
    },
    async addSetupContact({ name, relation, number, consent }) {
      await latency()
      const state = getState()
      const accountId = state.session.accountId
      const draft = selectSetup(state, accountId)
      const normalized = normalizePhone(number)
      if (!normalized) return { ok: false, error: 'numberInvalid' }
      if (!consent) return { ok: false, error: 'consentRequired' }
      if (draft.contacts.some((contact) => contact.number === normalized)) return { ok: false, error: 'numberTaken' }
      const contact = { id: newId('con'), name: name.trim(), relation, number: normalized, consentAt: Date.now() }
      // A new contact has not had a test message yet.
      dispatch({ type: 'setup/patch', accountId, patch: { contacts: [...draft.contacts, contact], tests: { ...draft.tests, sms: null } } })
      return { ok: true }
    },
    removeSetupContact(contactId) {
      const state = getState()
      const accountId = state.session.accountId
      const draft = selectSetup(state, accountId)
      dispatch({ type: 'setup/patch', accountId, patch: { contacts: draft.contacts.filter((contact) => contact.id !== contactId), tests: { ...draft.tests, sms: null } } })
    },
    async createSetupInvite({ name, relation, share }) {
      await latency()
      const state = getState()
      const taken = new Set(state.familyLinks.map((link) => link.code))
      let code
      do {
        code = `ALRT-${Array.from({ length: 4 }, () => INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)]).join('')}`
      } while (taken.has(code))
      dispatch({ type: 'setup/patch', accountId: state.session.accountId, patch: { invite: { code, name: name.trim(), relation, share, createdAt: Date.now() } } })
      return { ok: true, code }
    },
    setSetupShare(share) {
      const state = getState()
      const accountId = state.session.accountId
      const { invite } = selectSetup(state, accountId)
      if (invite) dispatch({ type: 'setup/patch', accountId, patch: { invite: { ...invite, share } } })
    },
    // Called when a test finishes: remembers it so the step shows it as done after a reload.
    recordSetupTest(kind) {
      const state = getState()
      const accountId = state.session.accountId
      const draft = selectSetup(state, accountId)
      const at = Date.now()
      const result = kind === 'sms' ? { at, results: draft.contacts.map((contact) => ({ contactId: contact.id, status: 'sent' })) } : { at }
      dispatch({ type: 'setup/patch', accountId, patch: { tests: { ...draft.tests, [kind]: result } } })
    },
    // Turns the draft into real records: vehicle, claimed unit, contacts, first settings, invite and audit entries.
    async finishSetup() {
      await latency()
      const state = getState()
      const account = selectAccount(state)
      const draft = selectSetup(state, account?.id)
      if (!account || !draft.vehicle || !draft.unit || draft.contacts.length === 0) return { ok: false, error: 'incomplete' }
      const now = Date.now()
      const vehicle = { id: newId('veh'), ...draft.vehicle, ownerId: account.id, ownerName: account.name, unitId: draft.unit.id }
      const contacts = draft.contacts.map((contact, index) => ({
        id: contact.id,
        vehicleId: vehicle.id,
        name: contact.name,
        relation: contact.relation,
        number: contact.number,
        priority: index + 1,
        consent: true,
        consentAt: contact.consentAt,
        linkedAccountId: null,
        lastDelivery: draft.tests.sms ? { status: 'sent', at: draft.tests.sms.at, eventId: null, test: true } : null,
      }))
      const link = draft.invite
        ? { id: newId('fam'), driverId: account.id, memberId: null, name: draft.invite.name, relation: draft.invite.relation, email: null, status: 'invited', code: draft.invite.code, share: draft.invite.share, invitedAt: draft.invite.createdAt, acceptedAt: null }
        : null
      const settings = { id: newId('set'), unitId: draft.unit.id, version: 1, content: { ...DEFAULT_SETTINGS, language: account.language }, status: 'applied', createdAt: now, appliedAt: now }
      const entry = (action, target, offset) => ({ id: newId('aud'), time: now + offset, actorId: account.id, actorName: account.name, action, target, detail: null })
      const audit = [
        ...(link ? [entry('family_invited', link.name, 0)] : []),
        ...contacts.flatMap((contact, index) => [entry('contact_added', contact.name, index * 2 + 1), entry('consent_recorded', contact.name, index * 2 + 2)]),
      ].sort((a, b) => b.time - a.time)
      dispatch({ type: 'setup/finish', accountId: account.id, vehicle, contacts, link, settings, audit })
      return { ok: true, vehicleName: vehicle.name }
    },

    // A finished Test SMS or Test alarm from Home. The SMS test leaves a delivery result on each contact; the alarm leaves none.
    recordUnitTest(vehicleId, kind) {
      if (kind !== 'sms') return
      const at = Date.now()
      selectContacts(getState(), vehicleId).forEach((contact) =>
        dispatch({ type: 'contact/delivery', contactId: contact.id, delivery: { status: 'sent', at, eventId: null, test: true } }))
    },

    // ---------- Event follow-up ----------
    // A family member confirms they have seen an alert. Doing it twice changes nothing.
    async acknowledgeEvent(eventId) {
      await latency()
      const state = getState()
      const account = selectAccount(state)
      const event = state.events.find((item) => item.id === eventId)
      if (!account || !event) return { ok: false, error: 'notFound' }
      if (!can(account.role, 'acknowledgeEvents')) return { ok: false, error: 'notAllowed' }
      if (event.acks.some((ack) => ack.accountId === account.id)) return { ok: true }
      dispatch({ type: 'event/patch', id: eventId, patch: { acks: [...event.acks, { accountId: account.id, name: account.name, at: Date.now() }] } })
      return { ok: true }
    },
    async addEventNote(eventId, text) {
      await latency()
      const state = getState()
      const account = selectAccount(state)
      const event = state.events.find((item) => item.id === eventId)
      const trimmed = String(text ?? '').trim()
      if (!account || !event) return { ok: false, error: 'notFound' }
      if (!can(account.role, 'addNotes')) return { ok: false, error: 'notAllowed' }
      if (!trimmed) return { ok: false, error: 'noteEmpty' }
      if (trimmed.length > NOTE_MAX) return { ok: false, error: 'noteLong' }
      dispatch({ type: 'event/patch', id: eventId, patch: { notes: [...event.notes, { id: newId('note'), accountId: account.id, name: account.name, at: Date.now(), text: trimmed }] } })
      return { ok: true }
    },
    // The driver says whether an alert was real or a false alarm.
    async reviewEvent(eventId, review) {
      await latency()
      const state = getState()
      const account = selectAccount(state)
      const event = state.events.find((item) => item.id === eventId)
      if (!account || !event) return { ok: false, error: 'notFound' }
      if (!can(account.role, 'reviewEvents') || !REVIEW_CHOICES.includes(review)) return { ok: false, error: 'notAllowed' }
      dispatch({ type: 'event/patch', id: eventId, patch: { review, reviewedBy: account.id, reviewedAt: Date.now() } })
      return { ok: true }
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
