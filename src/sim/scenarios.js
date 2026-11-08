import { pointAt } from '../lib/route'
import { selectContacts, selectRecipients, selectSettings, selectUnitOfVehicle } from '../store/selectors'

// A scenario builds a list of steps: { wait (ms after the previous step, at realistic speed), op, args }.
// Steps are plain data, so a run saved in the store can be finished after a reload. The ops below do the writing.
let counter = 0
const newId = (prefix) => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}`
const clamp01 = (n) => Math.min(1, Math.max(0, n))
const DEFAULT_COUNTDOWN_S = 30

function unitOf(api) {
  return selectUnitOfVehicle(api.getState(), api.vehicleId)
}

// Timeline steps are stamped in unit time (the scenario's own waits), so an event reads the same in Quick,
// in Realistic, and when a reload finishes the run at once. Each new event restarts the clock.
const stamp = (api) => (api.ctx.baseTime ?? api.now) + (api.unitMs - (api.ctx.baseMs ?? 0))

function createEvent(api, { type, level = null, measurements, open = true, outcome = null }) {
  const unit = unitOf(api)
  api.ctx.baseTime = api.now
  api.ctx.baseMs = api.unitMs
  return {
    id: newId('evt'),
    type,
    level,
    time: api.now,
    vehicleId: api.vehicleId,
    unitId: unit.id,
    position: pointAt(clamp01((unit.status.position?.s ?? 0.4) + api.rng.float(-0.02, 0.02))),
    speedKmh: api.rng.int(18, 52),
    fixAgeS: api.rng.int(1, 4),
    measurements,
    outcome,
    review: 'unreviewed',
    notes: [],
    acks: [],
    timeline: [],
    sms: [],
    open,
    receivedLate: false,
    receivedAt: api.now + 1000,
  }
}

const step = (api, eventId, kind, extra = {}) => api.dispatch({ type: 'event/timeline', id: eventId, step: { at: stamp(api), kind, ...extra } })

function closeEvent(api, eventId, outcome, kind, patch = {}) {
  step(api, eventId, kind)
  api.dispatch({ type: 'event/patch', id: eventId, patch: { open: false, outcome, ...patch } })
}

const setStatus = (api, patch) => api.dispatch({ type: 'unit/status', unitId: unitOf(api).id, patch })
const restoreMode = (api) => setStatus(api, { mode: unitOf(api).status.faults.includes('camera') ? 'degraded' : 'ready' })

function notify(api, { kind, audiences, shareKey, params = {}, group = null }) {
  const recipients = selectRecipients(api.getState(), api.vehicleId, audiences, shareKey)
  if (recipients.length === 0) return
  api.dispatch({
    type: 'notification/add',
    notification: { id: newId('ntf'), time: Date.now(), kind, vehicleId: api.vehicleId, eventId: api.ctx.eventId ?? null, recipients, params, group, read: false },
  })
}

// ---------- Ops ----------
export const ops = {
  drowsyStart(api, { level }) {
    const { ctx } = api
    if (ctx.eventId) closeEvent(api, ctx.eventId, 'escalated', 'escalated')
    const closure = level === 1 ? api.rng.float(1, 1.9) : level === 2 ? api.rng.float(2, 2.9) : api.rng.float(3, 4.5)
    const perclos = level === 1 ? api.rng.float(0.15, 0.24) : level === 2 ? api.rng.float(0.25, 0.33) : api.rng.float(0.3, 0.45)
    const event = createEvent(api, {
      type: 'drowsiness',
      level,
      measurements: { closureS: +closure.toFixed(1), perclos: +perclos.toFixed(2), yawnCount: api.rng.int(0, level + 1) },
    })
    event.timeline = [{ at: event.time, kind: 'detected', level }, { at: event.time + 400, kind: 'alarm', level }]
    api.dispatch({ type: 'event/add', event })
    ctx.eventId = event.id
    ctx.levels = (ctx.levels ?? 0) + 1
    ctx.alertId ??= newId('alr')
    ctx.alertStartedAt ??= Date.now()
    api.dispatch({
      type: 'alert/set',
      alert: { id: ctx.alertId, vehicleId: api.vehicleId, unitId: event.unitId, kind: 'drowsiness', level, phase: 'active', startedAt: ctx.alertStartedAt, levelStartedAt: Date.now(), eventId: event.id },
    })
    setStatus(api, { mode: 'alerting' })
    if (level === 3) {
      notify(api, { kind: 'drowsiness_critical', audiences: ['family'], shareKey: 'alerts', params: { count: ctx.levels }, group: `drowsiness:${api.vehicleId}` })
    }
  },
  drowsyButton(api) {
    step(api, api.ctx.eventId, 'button_pressed')
  },
  drowsyClear(api) {
    closeEvent(api, api.ctx.eventId, 'cleared', 'cleared')
    api.dispatch({ type: 'alert/end', id: api.ctx.alertId })
    restoreMode(api)
  },

  crashImpact(api, { cancel }) {
    const { ctx } = api
    const event = createEvent(api, {
      type: 'crash_confirmed',
      measurements: cancel
        ? { peakG: +api.rng.float(6.5, 13).toFixed(1), deltaVKmh: api.rng.int(10, 28), tiltDeg: api.rng.int(2, 20) }
        : { peakG: +api.rng.float(11, 21).toFixed(1), deltaVKmh: api.rng.int(24, 46), tiltDeg: api.rng.int(8, 70) },
    })
    event.timeline = [{ at: event.time, kind: 'impact' }]
    api.dispatch({ type: 'event/add', event })
    ctx.eventId = event.id
    ctx.alertId = newId('alr')
  },
  crashCountdown(api, { seconds }) {
    const { ctx } = api
    const durationMs = (seconds * 1000) / api.speed
    const startedAt = Date.now()
    ctx.seconds = seconds
    step(api, ctx.eventId, 'confirmed')
    step(api, ctx.eventId, 'countdown_started', { seconds })
    api.dispatch({
      type: 'alert/set',
      alert: { id: ctx.alertId, vehicleId: api.vehicleId, unitId: unitOf(api).id, kind: 'crash', level: null, phase: 'countdown', startedAt, endsAt: startedAt + durationMs, countdownS: seconds, eventId: ctx.eventId },
    })
    setStatus(api, { mode: 'crashCountdown' })
    notify(api, { kind: 'crash_countdown', audiences: ['family'], shareKey: 'alerts', params: { seconds } })
  },
  crashCancel(api) {
    const { ctx } = api
    step(api, ctx.eventId, 'cancelled', { atS: Math.round(ctx.seconds * 0.4) })
    api.dispatch({ type: 'event/patch', id: ctx.eventId, patch: { type: 'crash_cancelled', open: false, outcome: 'cancelled_by_driver', review: 'cancelled' } })
    api.dispatch({ type: 'alert/end', id: ctx.alertId })
    restoreMode(api)
    notify(api, { kind: 'crash_cancelled', audiences: ['family'], shareKey: 'alerts' })
  },
  crashSend(api, { failThird }) {
    const { ctx } = api
    const contacts = selectContacts(api.getState(), api.vehicleId)
    step(api, ctx.eventId, 'sending')
    api.dispatch({ type: 'alert/set', alert: { id: ctx.alertId, phase: 'sending', endsAt: null } })
    setStatus(api, { mode: 'crashSending' })
    api.dispatch({
      type: 'event/patch',
      id: ctx.eventId,
      patch: { sms: contacts.map((contact) => ({ contactId: contact.id, status: 'queued', attempts: 0, lastAttemptAt: null, delayS: null })) },
    })

    // First pass: one message every 3 s, in priority order. The third contact is the one that needs retries
    // (spec 3.7: retry after 15 s, then 30 s). Seconds here are unit time.
    const attempts = []
    contacts.forEach((contact, index) => {
      const at = (index + 1) * 3
      if (index !== 2) {
        attempts.push({ at, contactId: contact.id, attempt: 1, result: 'sent' })
        return
      }
      attempts.push({ at, contactId: contact.id, attempt: 1, result: 'retrying' })
      attempts.push({ at: at + 15, contactId: contact.id, attempt: 2, result: failThird ? 'retrying' : 'sent' })
      if (failThird) attempts.push({ at: at + 45, contactId: contact.id, attempt: 3, result: 'retrying' })
    })
    attempts.sort((a, b) => a.at - b.at)
    let previous = 0
    const inserted = attempts.map((item) => {
      const wait = (item.at - previous) * 1000
      previous = item.at
      return { wait, op: 'smsAttempt', args: item }
    })
    api.insert([...inserted, { wait: 0, op: 'smsDone' }])
  },
  smsAttempt(api, { contactId, attempt, result, at }) {
    const { ctx } = api
    const now = Date.now()
    api.dispatch({ type: 'event/sms', id: ctx.eventId, contactId, patch: { status: result, attempts: attempt, lastAttemptAt: now, delayS: result === 'sent' ? at : null } })
    step(api, ctx.eventId, `sms_${result}`, { contactId, attempt })
    api.dispatch({ type: 'contact/delivery', contactId, delivery: { status: result, at: now, eventId: ctx.eventId } })
  },
  smsDone(api) {
    const { ctx } = api
    const event = api.getState().events.find((item) => item.id === ctx.eventId)
    const sent = event.sms.filter((entry) => entry.status === 'sent').length
    const total = event.sms.length
    api.dispatch({ type: 'event/patch', id: ctx.eventId, patch: { open: false, outcome: sent === total ? 'sms_sent' : 'sms_partial' } })
    api.dispatch({ type: 'alert/end', id: ctx.alertId })
    restoreMode(api)
    notify(api, { kind: 'crash_sms', audiences: ['family'], shareKey: 'alerts', params: { sent, total } })
  },

  offlineStart(api) {
    setStatus(api, { presence: 'offline' })
    notify(api, { kind: 'unit_offline', audiences: ['driver', 'family'], shareKey: 'status' })
  },
  offlineEvent(api) {
    const now = Date.now()
    const event = createEvent(api, {
      type: 'drowsiness',
      level: 2,
      open: false,
      outcome: 'cleared',
      measurements: { closureS: +api.rng.float(2, 2.9).toFixed(1), perclos: +api.rng.float(0.25, 0.33).toFixed(2), yawnCount: api.rng.int(0, 3) },
    })
    event.timeline = [{ at: now, kind: 'detected', level: 2 }, { at: now + 400, kind: 'alarm', level: 2 }, { at: now + 11000, kind: 'cleared' }]
    api.dispatch({ type: 'pending/add', event })
  },
  onlineReturn(api) {
    const now = Date.now()
    setStatus(api, { presence: 'online', lastSeen: now, updatedAt: now })
    api.dispatch({ type: 'pending/flush', now })
  },

  faultStart(api, { fault }) {
    const { ctx } = api
    const unit = unitOf(api)
    const now = Date.now()
    ctx.fault = fault
    if (fault === 'camera') {
      const event = createEvent(api, { type: 'camera_fault', measurements: { reason: 'face_not_visible' } })
      event.timeline = [{ at: now - 20000, kind: 'face_not_visible' }, { at: now, kind: 'fault_logged' }]
      api.dispatch({ type: 'event/add', event })
      ctx.eventId = event.id
      api.dispatch({ type: 'unit/health', unitId: unit.id, patch: { camera: 'fault' } })
      setStatus(api, { faults: [...unit.status.faults, 'camera'], mode: 'degraded' })
    } else {
      const event = createEvent(api, { type: 'power', measurements: { kind: 'low_battery', batteryPct: 8 } })
      event.timeline = [{ at: now, kind: 'logged' }]
      api.dispatch({ type: 'event/add', event })
      ctx.eventId = event.id
      ctx.previousBattery = unit.status.battery
      setStatus(api, { faults: [...unit.status.faults, 'battery'], battery: 8 })
    }
    notify(api, { kind: 'unit_fault', audiences: ['driver', 'admin'], params: { fault } })
  },
  faultClear(api) {
    const { ctx } = api
    const unit = unitOf(api)
    const faults = unit.status.faults.filter((item) => item !== ctx.fault)
    if (ctx.fault === 'camera') {
      api.dispatch({ type: 'unit/health', unitId: unit.id, patch: { camera: 'ok' } })
      setStatus(api, { faults, mode: faults.includes('camera') ? 'degraded' : 'ready' })
    } else {
      setStatus(api, { faults, battery: ctx.previousBattery ?? 92 })
    }
    closeEvent(api, ctx.eventId, 'resolved', 'resolved')
  },
}

// ---------- Scenario catalog (PLAN.md Section 6) ----------
const seconds = (state, vehicleId) => {
  const unit = selectUnitOfVehicle(state, vehicleId)
  return selectSettings(state, unit.id)?.countdownS ?? DEFAULT_COUNTDOWN_S
}

const drowsiness = (levels, recoverWait) => [
  ...levels.map(({ level, wait }) => ({ wait, op: 'drowsyStart', args: { level } })),
  ...(levels[levels.length - 1].level === 3 ? [{ wait: 6000, op: 'drowsyButton' }] : []),
  { wait: recoverWait, op: 'drowsyClear' },
]

const crash = ({ cancel, failThird = false }) => (state, vehicleId) => {
  const countdownS = seconds(state, vehicleId)
  return [
    { wait: 0, op: 'crashImpact', args: { cancel } },
    { wait: 2000, op: 'crashCountdown', args: { seconds: countdownS } },
    cancel ? { wait: countdownS * 400, op: 'crashCancel' } : { wait: countdownS * 1000, op: 'crashSend', args: { failThird } },
  ]
}

const fault = (kind) => () => [
  { wait: 0, op: 'faultStart', args: { fault: kind } },
  { wait: 60000, op: 'faultClear' },
]

export const scenarios = [
  { id: 'drowsy1', build: () => drowsiness([{ level: 1, wait: 0 }], 10000) },
  { id: 'drowsy2', build: () => drowsiness([{ level: 2, wait: 0 }], 10000) },
  { id: 'drowsy3', build: () => drowsiness([{ level: 3, wait: 0 }], 10000) },
  { id: 'drowsyEscalation', build: () => drowsiness([{ level: 1, wait: 0 }, { level: 2, wait: 10000 }, { level: 3, wait: 15000 }], 10000) },
  { id: 'crashCancel', build: crash({ cancel: true }) },
  { id: 'crashSent', build: crash({ cancel: false }) },
  { id: 'crashFail', build: crash({ cancel: false, failThird: true }) },
  {
    id: 'unitOffline',
    build: () => [
      { wait: 0, op: 'offlineStart' },
      { wait: 8000, op: 'offlineEvent' },
      { wait: 12000, op: 'onlineReturn' },
    ],
  },
  { id: 'faultCamera', build: fault('camera') },
  { id: 'faultBattery', build: fault('battery') },
]
