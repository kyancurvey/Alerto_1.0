import { pointAt } from '../lib/route'
import { createRng } from './prng'
import { fills, PASSWORD } from './fills'

const MIN = 60 * 1000
const HOUR = 60 * MIN
const DAY = 24 * HOUR
const MANILA = 8 * HOUR
export const LATEST_FIRMWARE = '1.4.2'

// Start of the current day in Asia/Manila, as a UTC timestamp.
const manilaDayStart = (now) => Math.floor((now + MANILA) / DAY) * DAY - MANILA
const manilaWeekday = (dayStart) => new Date(dayStart + MANILA).getUTCDay()

// Hours of the day (Manila) weighted for drowsiness: peaks at 4 to 6 AM and 1 to 3 PM.
const HOUR_WEIGHTS = [0.2, 0.2, 0.2, 0.2, 5, 5, 1.2, 1.2, 1.2, 1.2, 1.2, 1.2, 1, 4, 4, 1.2, 1.2, 1.2, 1.2, 0.6, 0.6, 0.6, 0.1, 0.1]

const VOLUME_DEFAULT = 'medium'
export const DEFAULT_SETTINGS = { countdownS: 30, volume: VOLUME_DEFAULT, language: 'fil', sensitivity: 'normal', positionReports: false, holdDelayMin: 2 }

const FLEET = [
  { unit: 'ALT-0001', owner: 'Efren Magat', firmware: '1.4.2', presence: 'online' },
  { unit: 'ALT-0002', owner: 'Nestor Villanueva', firmware: '1.4.2', presence: 'online' },
  { unit: 'ALT-0003', owner: 'Danilo Atienza', firmware: '1.4.1', presence: 'online' },
  { unit: 'ALT-0004', owner: 'Rogelio Macaraig', firmware: '1.4.2', presence: 'online', cameraFault: true },
  { unit: 'ALT-0005', owner: 'Benjie Panganiban', firmware: '1.3.9', presence: 'parked' },
  { unit: 'ALT-0006', owner: 'Arnel Bautista', firmware: '1.4.2', presence: 'offline' },
  { unit: 'ALT-0009', owner: 'Ernesto Dimaculangan', firmware: '1.4.2', presence: 'online' },
  { unit: 'ALT-0010', owner: 'Rodel Hernandez', firmware: '1.4.1', presence: 'parked' },
  { unit: 'ALT-0011', owner: 'Allan Mercado', firmware: '1.4.2', presence: 'online' },
]

const LOG_LINES = [
  ['info', 'alerto-supervisor: unit state ready'],
  ['info', 'alerto-comms: LTE attached, signal {signal}/5'],
  ['info', 'alerto-sync: heartbeat sent, firmware {firmware}'],
  ['info', 'alerto-vision: self-check passed'],
  ['info', 'alerto-sensors: ADXL375 self-test passed'],
  ['info', 'alerto-power: ignition on, battery {battery}%'],
  ['info', 'alerto-sync: settings confirmed'],
  ['info', 'alerto-comms: GNSS fix acquired'],
  ['info', 'alerto-alert: alarm path check passed'],
  ['info', 'alerto-sync: event queue empty'],
]

export function createSeed(now = Date.now()) {
  const rng = createRng(20260)
  const todayStart = manilaDayStart(now)
  const id = (prefix, n) => `${prefix}_${String(n).padStart(3, '0')}`

  // ---------- Accounts ----------
  const accounts = [
    { id: 'acc_ramon', role: 'driver', name: 'Ramon Dela Cruz', email: fills.driver.email, password: PASSWORD, language: 'en' },
    { id: 'acc_liza', role: 'family', name: 'Liza Dela Cruz', email: fills.family.email, password: PASSWORD, language: 'fil' },
    { id: 'acc_admin', role: 'admin', name: 'Research Admin', email: fills.admin.email, password: PASSWORD, language: 'en' },
  ]

  // ---------- Vehicles and units ----------
  const route = 'Batangas City – Rosario'
  const usedPlates = new Set(['DAB 4521', 'DAC 1187', fills.newVehicle.plate])
  const randomPlate = () => {
    for (;;) {
      const letters = Array.from({ length: 3 }, () => String.fromCharCode(65 + rng.int(0, 25))).join('')
      const plate = `D${letters.slice(0, 2)} ${rng.int(1000, 9999)}`
      if (!usedPlates.has(plate)) {
        usedPlates.add(plate)
        return plate
      }
    }
  }

  const vehicles = [
    { id: 'veh_1', name: 'Jeep ni Mang Ramon', plate: 'DAB 4521', route, ownerId: 'acc_ramon', ownerName: 'Ramon Dela Cruz', unitId: 'ALT-0007' },
    { id: 'veh_2', name: 'Pangalawang Jeep', plate: 'DAC 1187', route, ownerId: 'acc_ramon', ownerName: 'Ramon Dela Cruz', unitId: 'ALT-0008' },
  ]

  const unitBase = (unitId, vehicleId, firmware, status, pairingCode, health) => ({
    id: unitId,
    vehicleId,
    pairingCode,
    claimed: Boolean(vehicleId),
    firmware,
    status,
    health: { sensors: 'ok', camera: 'ok', modem: 'ok', ...health },
    calibration: { state: vehicleId ? 'calibrated' : 'none', at: vehicleId ? now - 20 * DAY : null },
  })

  const units = [
    unitBase('ALT-0007', 'veh_1', '1.4.2', {
      presence: 'online', mode: 'ready', lastSeen: now, updatedAt: now, ignition: true, battery: 92, signal: 4, gps: 'good', faults: [], position: { s: 0.42 },
    }, 'ALT-5N2-41D'),
    unitBase('ALT-0008', 'veh_2', '1.4.1', {
      presence: 'parked', mode: 'hold', lastSeen: now - 18 * HOUR, updatedAt: now - 18 * HOUR, ignition: false, battery: 100, signal: 3, gps: 'good', faults: [], position: { s: 0.04 },
    }, 'ALT-8R6-27B'),
  ]

  FLEET.forEach((item, index) => {
    const vehicleId = `veh_f${index + 1}`
    const presence = item.presence
    const lastSeen = presence === 'online' ? now : presence === 'parked' ? now - rng.int(3, 20) * HOUR : now - rng.int(2, 5) * HOUR
    vehicles.push({
      id: vehicleId,
      name: `Jeep ni ${item.owner.split(' ')[0]}`,
      plate: randomPlate(),
      route,
      ownerId: null,
      ownerName: item.owner,
      unitId: item.unit,
    })
    units.push(unitBase(item.unit, vehicleId, item.firmware, {
      presence,
      mode: item.cameraFault ? 'degraded' : presence === 'parked' ? 'hold' : 'ready',
      lastSeen,
      updatedAt: lastSeen,
      ignition: presence === 'online',
      battery: rng.int(55, 100),
      signal: rng.int(2, 5),
      gps: 'good',
      faults: item.cameraFault ? ['camera'] : [],
      position: { s: +rng.float(0.05, 0.95).toFixed(3) },
    }, `ALT-${rng.int(1, 9)}${String.fromCharCode(65 + rng.int(0, 25))}${rng.int(1, 9)}-${rng.int(10, 99)}${String.fromCharCode(65 + rng.int(0, 25))}`, item.cameraFault ? { camera: 'fault' } : {}))
  })

  // Unit waiting to be claimed by the new driver.
  units.push({ ...unitBase(fills.newUnit.id, null, LATEST_FIRMWARE, { presence: 'offline', mode: 'ready', lastSeen: null, updatedAt: null, ignition: false, battery: 100, signal: 0, gps: 'none', faults: [], position: null }, fills.newUnit.pairingCode), claimed: false })
  units.sort((a, b) => a.id.localeCompare(b.id))

  // ---------- Contacts, family links, settings ----------
  const contacts = [
    { id: 'con_1', vehicleId: 'veh_1', name: 'Liza Dela Cruz', relation: 'spouse', number: '0917 555 0101', priority: 1, consent: true, consentAt: now - 28 * DAY, linkedAccountId: 'acc_liza' },
    { id: 'con_2', vehicleId: 'veh_1', name: 'Cora Dela Cruz', relation: 'sister', number: '0917 555 0102', priority: 2, consent: true, consentAt: now - 28 * DAY, linkedAccountId: null },
    { id: 'con_3', vehicleId: 'veh_1', name: 'Kap. Berting Magsino', relation: 'barangay captain', number: '0917 555 0103', priority: 3, consent: true, consentAt: now - 27 * DAY, linkedAccountId: null },
  ].map((contact) => ({ ...contact, lastDelivery: null }))

  const familyLinks = [
    { id: 'fam_liza', driverId: 'acc_ramon', memberId: 'acc_liza', name: 'Liza Dela Cruz', relation: 'spouse', email: fills.family.email, status: 'accepted', code: 'ALRT-31M7', share: { alerts: true, map: true, status: true }, invitedAt: now - 28 * DAY, acceptedAt: now - 28 * DAY + 2 * HOUR },
    { id: 'fam_jonel', driverId: 'acc_ramon', memberId: null, name: fills.invite.name, relation: fills.invite.relation, email: fills.invite.email, status: 'invited', code: fills.invite.code, share: { alerts: true, map: false, status: true }, invitedAt: now - 2 * DAY, acceptedAt: null },
  ]

  const settingsVersions = [
    { id: 'set_1', unitId: 'ALT-0007', version: 1, content: { ...DEFAULT_SETTINGS }, status: 'applied', createdAt: now - 28 * DAY, appliedAt: now - 28 * DAY + 5 * MIN },
    { id: 'set_2', unitId: 'ALT-0007', version: 2, content: { ...DEFAULT_SETTINGS, positionReports: true }, status: 'applied', createdAt: now - 9 * DAY, appliedAt: now - 9 * DAY + 3 * MIN },
    { id: 'set_3', unitId: 'ALT-0008', version: 1, content: { ...DEFAULT_SETTINGS }, status: 'applied', createdAt: now - 20 * DAY, appliedAt: now - 20 * DAY + 4 * MIN },
  ]

  // ---------- Events (30 days) ----------
  const windowStart = now - 30 * DAY
  const dayWeights = Array.from({ length: 30 }, (_, d) => (manilaWeekday(todayStart - d * DAY) === 0 ? 0.4 : 1))
  const usedTimes = new Set()

  // Random time in the last 30 days that is at least `minAgo` ms old.
  const sampleTime = (minAgo = 5 * MIN) => {
    for (;;) {
      const day = rng.weighted(dayWeights)
      const hour = rng.weighted(HOUR_WEIGHTS)
      const time = todayStart - day * DAY + hour * HOUR + rng.int(0, 59) * MIN + rng.int(0, 59) * 1000
      if (time <= now - minAgo && time >= windowStart && !usedTimes.has(time)) {
        usedTimes.add(time)
        return time
      }
    }
  }
  // Time earlier today, when there is enough of the day gone by.
  const sampleToday = () => {
    const span = now - 30 * MIN - todayStart
    return span > 2 * HOUR ? todayStart + Math.floor(rng.float(0.5, 1) * span) : sampleTime()
  }

  const speed = () => rng.int(18, 52)
  const fixAge = () => (rng.chance(0.85) ? rng.int(1, 4) : rng.int(8, 45))
  const base = (type, time, vehicleId) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId)
    return {
      type,
      time,
      vehicleId,
      unitId: vehicle.unitId,
      position: pointAt(rng.float(0.03, 0.97)),
      speedKmh: speed(),
      fixAgeS: fixAge(),
      level: null,
      measurements: {},
      outcome: null,
      review: 'unreviewed',
      notes: [],
      acks: [],
      timeline: [],
      sms: [],
      open: false,
      receivedLate: false,
      receivedAt: time + rng.int(2, 9) * 1000,
    }
  }

  const raw = []
  const pickVehicle = () => (rng.chance(0.12) ? 'veh_2' : 'veh_1')

  const drowsy = (level, time, vehicleId) => {
    const event = base('drowsiness', time, vehicleId)
    const closure = level === 1 ? rng.float(1, 1.9) : level === 2 ? rng.float(2, 2.9) : rng.float(3, 4.5)
    const perclos = level === 1 ? rng.float(0.15, 0.24) : level === 2 ? rng.float(0.25, 0.33) : rng.float(0.3, 0.45)
    event.level = level
    event.measurements = { closureS: +closure.toFixed(1), perclos: +perclos.toFixed(2), yawnCount: rng.int(0, level + 1) }
    event.outcome = 'cleared'
    const clearAfter = rng.int(10, 24) * 1000
    event.timeline = [
      { at: time, kind: 'detected', level },
      { at: time + 400, kind: 'alarm', level },
      ...(level === 3 ? [{ at: time + 6000, kind: 'button_pressed' }] : []),
      { at: time + clearAfter + (level === 3 ? 8000 : 0), kind: 'cleared' },
    ]
    return event
  }

  // 70 drowsiness events: 45 level 1, 20 level 2, 5 level 3 (each level 3 follows a level 2 and a level 1).
  for (let i = 0; i < 5; i += 1) {
    const vehicleId = 'veh_1'
    const t3 = sampleTime()
    raw.push(drowsy(3, t3, vehicleId))
    raw.push(drowsy(2, t3 - 3 * MIN, vehicleId))
    raw.push(drowsy(1, t3 - 6 * MIN, vehicleId))
  }
  for (let i = 0; i < 40; i += 1) {
    const vehicleId = i === 0 ? 'veh_1' : pickVehicle()
    raw.push(drowsy(1, i === 0 ? sampleToday() : sampleTime(vehicleId === 'veh_2' ? 20 * HOUR : 5 * MIN), vehicleId))
  }
  for (let i = 0; i < 15; i += 1) {
    const vehicleId = i === 0 ? 'veh_1' : pickVehicle()
    raw.push(drowsy(2, i === 0 ? sampleToday() : sampleTime(vehicleId === 'veh_2' ? 20 * HOUR : 5 * MIN), vehicleId))
  }

  // Crash events on vehicle 1.
  const smsTimeline = (start, sms) => sms.flatMap((entry) => [
    ...(entry.attempts > 1 ? [{ at: start + (entry.delayS - 15) * 1000, kind: 'sms_retrying', contactId: entry.contactId, attempt: 1 }] : []),
    { at: start + entry.delayS * 1000, kind: 'sms_sent', contactId: entry.contactId, attempt: entry.attempts },
  ])
  const crash = (time, review) => {
    const event = base('crash_confirmed', time, 'veh_1')
    const countdownS = 30
    const sendAt = time + 3000 + countdownS * 1000
    const sms = [
      { contactId: 'con_1', status: 'sent', attempts: 1, delayS: 3 },
      { contactId: 'con_2', status: 'sent', attempts: 1, delayS: 6 },
      { contactId: 'con_3', status: 'sent', attempts: 2, delayS: 24 },
    ].map((entry) => ({ ...entry, lastAttemptAt: sendAt + entry.delayS * 1000 }))
    event.measurements = { peakG: +rng.float(11, 21).toFixed(1), deltaVKmh: rng.int(24, 46), tiltDeg: rng.int(8, 70) }
    event.outcome = 'sms_sent'
    event.review = review
    event.sms = sms
    event.timeline = [
      { at: time, kind: 'impact' },
      { at: time + 3000, kind: 'confirmed' },
      { at: time + 3000, kind: 'countdown_started', seconds: countdownS },
      { at: sendAt, kind: 'sending' },
      ...smsTimeline(sendAt, sms),
    ]
    return event
  }
  const falseAlarm = crash(sampleTime(2 * DAY), 'false_alarm')
  falseAlarm.acks = [{ accountId: 'acc_liza', name: 'Liza Dela Cruz', at: falseAlarm.time + 4 * MIN, note: 'Okay lang daw si Ramon, lubak lang.' }]
  falseAlarm.reviewedBy = 'acc_ramon'
  raw.push(falseAlarm)
  raw.push(crash(sampleTime(DAY), 'unreviewed'))

  for (let i = 0; i < 4; i += 1) {
    const time = sampleTime(DAY)
    const event = base('crash_cancelled', time, 'veh_1')
    const countdownS = 30
    const cancelAtS = rng.int(6, 18)
    event.measurements = { peakG: +rng.float(6.5, 13).toFixed(1), deltaVKmh: rng.int(10, 28), tiltDeg: rng.int(2, 20) }
    event.outcome = 'cancelled_by_driver'
    event.review = 'cancelled'
    event.timeline = [
      { at: time, kind: 'impact' },
      { at: time + 3000, kind: 'confirmed' },
      { at: time + 3000, kind: 'countdown_started', seconds: countdownS },
      { at: time + 3000 + cancelAtS * 1000, kind: 'cancelled', atS: cancelAtS },
    ]
    raw.push(event)
  }

  for (let i = 0; i < 9; i += 1) {
    const vehicleId = i < 8 ? 'veh_1' : 'veh_2'
    const time = sampleTime(vehicleId === 'veh_2' ? 20 * HOUR : 5 * MIN)
    const event = base('impact_no_alert', time, vehicleId)
    event.measurements = { peakG: +rng.float(3.2, 5.8).toFixed(1), deltaVKmh: rng.int(2, 9), tiltDeg: rng.int(0, 6) }
    event.outcome = 'dismissed'
    event.timeline = [{ at: time, kind: 'impact' }, { at: time + 5000, kind: 'dismissed' }]
    raw.push(event)
  }

  for (let i = 0; i < 2; i += 1) {
    const vehicleId = i === 0 ? 'veh_1' : 'veh_2'
    const time = sampleTime(vehicleId === 'veh_2' ? 20 * HOUR : 5 * MIN)
    const event = base('camera_fault', time, vehicleId)
    event.measurements = { reason: i === 0 ? 'face_not_visible' : 'camera_covered' }
    event.outcome = 'resolved'
    event.timeline = [{ at: time - 20000, kind: 'face_not_visible' }, { at: time, kind: 'fault_logged' }, { at: time + 6 * MIN, kind: 'resolved' }]
    raw.push(event)
  }

  {
    const time = sampleTime()
    const event = base('sensor_fault', time, 'veh_1')
    event.measurements = { sensor: 'icm42670', check: 'stuck_axis' }
    event.outcome = 'resolved'
    event.timeline = [{ at: time, kind: 'fault_logged' }, { at: time + 3 * MIN, kind: 'resolved' }]
    raw.push(event)
  }

  ;['ignition_off_hold', 'low_battery', 'supply_lost'].forEach((kind, index) => {
    const vehicleId = index === 2 ? 'veh_2' : 'veh_1'
    const time = sampleTime(vehicleId === 'veh_2' ? 20 * HOUR : 5 * MIN)
    const event = base('power', time, vehicleId)
    event.measurements = { kind }
    event.outcome = 'logged'
    event.timeline = [{ at: time, kind: 'logged' }]
    raw.push(event)
  })

  const events = raw
    .sort((a, b) => b.time - a.time)
    .map((event, index) => ({ ...event, id: id('evt', index + 1), timeline: event.timeline.sort((a, b) => a.at - b.at) }))

  // ---------- Notifications (history, already read) ----------
  const notifications = []
  const note = (time, kind, event, params = {}) =>
    notifications.push({ id: id('ntf', notifications.length + 1), time, kind, vehicleId: event.vehicleId, eventId: event.id, recipients: ['acc_liza'], params, group: null, read: true })
  events.forEach((event) => {
    if (event.vehicleId !== 'veh_1') return
    if (event.type === 'drowsiness' && event.level === 3) note(event.time + 1000, 'drowsiness_critical', event, { count: 3 })
    if (event.type === 'crash_confirmed') {
      note(event.time + 3000, 'crash_countdown', event)
      note(event.time + 3000 + 30000 + 57000, 'crash_sms', event, { sent: 3, total: 3 })
    }
    if (event.type === 'crash_cancelled') {
      note(event.time + 3000, 'crash_countdown', event)
      note(event.timeline[event.timeline.length - 1].at, 'crash_cancelled', event)
    }
  })
  notifications.sort((a, b) => b.time - a.time)

  // ---------- Contact delivery results ----------
  const lastCrash = events.find((event) => event.type === 'crash_confirmed' && event.vehicleId === 'veh_1')
  contacts.forEach((contact) => {
    const entry = lastCrash.sms.find((sms) => sms.contactId === contact.id)
    contact.lastDelivery = { status: entry.status, at: entry.lastAttemptAt, eventId: lastCrash.id }
  })

  // ---------- Audit log ----------
  const audit = [
    [28 * DAY, 'consent_recorded', 'Liza Dela Cruz', null],
    [28 * DAY, 'contact_added', 'Liza Dela Cruz', null],
    [28 * DAY, 'contact_added', 'Cora Dela Cruz', null],
    [27 * DAY, 'contact_added', 'Kap. Berting Magsino', null],
    [27 * DAY, 'contact_reordered', 'Jeep ni Mang Ramon', null],
    [9 * DAY, 'setting_changed', 'Jeep ni Mang Ramon', { key: 'positionReports', from: false, to: true }],
    [2 * DAY, 'family_invited', 'Jonel Dela Cruz', null],
  ].map(([ago, action, target, detail], index) => ({ id: id('aud', index + 1), time: now - ago, actorId: 'acc_ramon', actorName: 'Ramon Dela Cruz', action, target, detail }))
    .sort((a, b) => b.time - a.time)

  // ---------- Remote logs (fleet) ----------
  const remoteLogs = {}
  units.filter((unit) => unit.claimed).forEach((unit) => {
    const lines = LOG_LINES.map(([level, line], index) => ({
      at: unit.status.lastSeen - (LOG_LINES.length - index) * 9 * MIN,
      level,
      line: line.replace('{signal}', unit.status.signal).replace('{firmware}', unit.firmware).replace('{battery}', unit.status.battery),
    }))
    if (unit.health.camera === 'fault') {
      lines.push({ at: unit.status.lastSeen - 4 * MIN, level: 'warn', line: 'alerto-vision: no face for 20 s, camera fault logged' })
      lines.push({ at: unit.status.lastSeen - 4 * MIN + 1000, level: 'warn', line: 'alerto-supervisor: unit state degraded' })
    }
    remoteLogs[unit.id] = lines.sort((a, b) => b.at - a.at)
  })

  return {
    meta: { schema: 1, seededAt: now, latestFirmware: LATEST_FIRMWARE },
    language: 'en',
    timing: 'quick',
    connection: 'online',
    activeVehicleId: 'veh_1',
    session: { accountId: null },
    accounts,
    vehicles,
    units,
    contacts,
    familyLinks,
    settingsVersions,
    events,
    pendingEvents: [],
    alerts: [],
    notifications,
    auditLog: audit,
    remoteLogs,
    run: null,
    setup: {},
  }
}
