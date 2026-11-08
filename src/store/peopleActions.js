import { latency } from '../lib/latency'
import { can } from '../lib/permissions'
import { RELATIONS } from '../lib/setup'
import { normalizePhone } from '../lib/validate'
import { newId } from './ids'
import { selectAccount, selectContacts, selectVehicle } from './selectors'

const INVITE_CODE_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
const SHARE_KEYS = ['alerts', 'map', 'status']

const entry = (account, action, target, detail = null, offset = 0) => ({ id: newId('aud'), time: Date.now() + offset, actorId: account.id, actorName: account.name, action, target, detail })

// Contact and family actions for a driver. Moving a contact and changing what a family member sees are instant:
// the next crash and the family member's own app use the change straight away.
export function createPeopleActions({ dispatch, getState }) {
  // The driver and one of their contacts' vehicles.
  const ownVehicle = (vehicleId) => {
    const state = getState()
    const account = selectAccount(state)
    const vehicle = selectVehicle(state, vehicleId)
    return account && vehicle && vehicle.ownerId === account.id && can(account.role, 'manageContacts') ? { state, account, vehicle } : null
  }
  const ownContact = (contactId) => {
    const contact = getState().contacts.find((item) => item.id === contactId)
    const own = contact ? ownVehicle(contact.vehicleId) : null
    return own ? { ...own, contact } : null
  }
  const ownLink = (linkId) => {
    const state = getState()
    const account = selectAccount(state)
    const link = state.familyLinks.find((item) => item.id === linkId)
    return account && link && link.driverId === account.id && can(account.role, 'manageFamily') ? { state, account, link } : null
  }

  // Checks a contact's details. Returns the error key, or the clean values.
  const clean = (state, vehicleId, values, ignoreId, current = null) => {
    const number = normalizePhone(values.number)
    if (String(values.name ?? '').trim().length < 2) return { error: 'nameRequired' }
    if (!RELATIONS.includes(values.relation) && values.relation !== current?.relation) return { error: 'relationRequired' }
    if (!number) return { error: 'numberInvalid' }
    if (selectContacts(state, vehicleId).some((contact) => contact.number === number && contact.id !== ignoreId)) return { error: 'numberTaken' }
    return { values: { name: values.name.trim(), relation: values.relation, number } }
  }

  return {
    // A new contact needs the person's agreement to be contacted. It goes to the end of the order.
    async addContact(vehicleId, { name, relation, number, consent }) {
      await latency()
      const own = ownVehicle(vehicleId)
      if (!own) return { ok: false, error: 'notAllowed' }
      const { state, account, vehicle } = own
      const found = clean(state, vehicleId, { name, relation, number })
      if (found.error) return { ok: false, error: found.error }
      if (!consent) return { ok: false, error: 'consentRequired' }
      const now = Date.now()
      const contact = {
        id: newId('con'),
        vehicleId,
        ...found.values,
        priority: selectContacts(state, vehicleId).length + 1,
        consent: true,
        consentAt: now,
        linkedAccountId: null,
        lastDelivery: null,
      }
      dispatch({ type: 'contact/add', contact, audit: [entry(account, 'consent_recorded', contact.name, null, 1), entry(account, 'contact_added', contact.name, { vehicle: vehicle.name }, 0)] })
      return { ok: true, contactId: contact.id }
    },

    // Changing the number means a different person: their agreement is asked for again.
    async updateContact(contactId, { name, relation, number, consent }) {
      await latency()
      const own = ownContact(contactId)
      if (!own) return { ok: false, error: 'notAllowed' }
      const { state, account, contact } = own
      const found = clean(state, contact.vehicleId, { name, relation, number }, contact.id, contact)
      if (found.error) return { ok: false, error: found.error }
      const numberChanged = found.values.number !== contact.number
      if (numberChanged && !consent) return { ok: false, error: 'consentRequired' }
      const fields = ['name', 'relation', 'number'].filter((key) => found.values[key] !== contact[key])
      if (fields.length === 0) return { ok: true, unchanged: true }
      const patch = { ...found.values, ...(numberChanged ? { consentAt: Date.now(), consent: true, lastDelivery: null } : {}) }
      dispatch({
        type: 'contact/patch',
        id: contact.id,
        patch,
        audit: [...(numberChanged ? [entry(account, 'consent_recorded', patch.name, null, 1)] : []), entry(account, 'contact_edited', patch.name, { fields }, 0)],
      })
      return { ok: true }
    },

    // A vehicle keeps at least one contact, as at setup: somebody has to get the crash message.
    async removeContact(contactId) {
      await latency()
      const own = ownContact(contactId)
      if (!own) return { ok: false, error: 'notAllowed' }
      const { state, account, contact } = own
      if (selectContacts(state, contact.vehicleId).length <= 1) return { ok: false, error: 'lastContact' }
      dispatch({ type: 'contact/remove', id: contact.id, vehicleId: contact.vehicleId, audit: [entry(account, 'contact_removed', contact.name)] })
      return { ok: true }
    },

    // Moves a contact one place up or down (`direction` is 'up' or 'down'). The next crash messages go out in the new order.
    moveContact(contactId, direction) {
      const own = ownContact(contactId)
      if (!own) return { ok: false, error: 'notAllowed' }
      const { state, account, vehicle, contact } = own
      const ids = selectContacts(state, contact.vehicleId).map((item) => item.id)
      const from = ids.indexOf(contact.id)
      const to = direction === 'up' ? from - 1 : from + 1
      if (to < 0 || to >= ids.length) return { ok: false, error: 'edge' }
      ids.splice(to, 0, ...ids.splice(from, 1))
      dispatch({ type: 'contact/order', vehicleId: contact.vehicleId, ids, audit: [entry(account, 'contact_reordered', vehicle.name, { name: contact.name, from: from + 1, to: to + 1 })] })
      return { ok: true }
    },

    // Invites a family member by link or code. They choose to join; what they may see is set here.
    async createFamilyInvite({ name, relation, share }) {
      await latency()
      const state = getState()
      const account = selectAccount(state)
      if (!account || !can(account.role, 'manageFamily')) return { ok: false, error: 'notAllowed' }
      if (String(name ?? '').trim().length < 2) return { ok: false, error: 'nameRequired' }
      if (!RELATIONS.includes(relation)) return { ok: false, error: 'relationRequired' }
      if (!SHARE_KEYS.some((key) => share?.[key])) return { ok: false, error: 'shareRequired' }
      const taken = new Set(state.familyLinks.map((link) => link.code))
      let code
      do {
        code = `ALRT-${Array.from({ length: 4 }, () => INVITE_CODE_CHARS[Math.floor(Math.random() * INVITE_CODE_CHARS.length)]).join('')}`
      } while (taken.has(code))
      const now = Date.now()
      const link = {
        id: newId('fam'),
        driverId: account.id,
        memberId: null,
        name: name.trim(),
        relation,
        email: null,
        status: 'invited',
        code,
        share: Object.fromEntries(SHARE_KEYS.map((key) => [key, Boolean(share[key])])),
        invitedAt: now,
        acceptedAt: null,
      }
      dispatch({ type: 'family/add', link, audit: [entry(account, 'family_invited', link.name)] })
      return { ok: true, code, linkId: link.id }
    },

    // What a family member sees. Their app follows at once.
    setFamilyShare(linkId, key, value) {
      const own = ownLink(linkId)
      if (!own || !SHARE_KEYS.includes(key)) return { ok: false, error: 'notAllowed' }
      const { account, link } = own
      if (Boolean(link.share[key]) === value) return { ok: true }
      dispatch({ type: 'family/share', id: link.id, share: { ...link.share, [key]: value }, audit: [entry(account, 'family_visibility_changed', link.name, { key, to: value })] })
      return { ok: true }
    },

    // Ends access, or cancels an invitation that nobody used yet. It takes effect at once.
    async removeFamilyAccess(linkId) {
      await latency()
      const own = ownLink(linkId)
      if (!own) return { ok: false, error: 'notAllowed' }
      const { account, link } = own
      dispatch({ type: 'family/remove', id: link.id, audit: [entry(account, 'family_removed', link.name, { status: link.status })] })
      return { ok: true }
    },
  }
}
