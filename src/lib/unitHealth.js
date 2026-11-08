// What a unit reports about itself, as rows the Vehicles screens show. `ok` is false when the row needs attention.
export const LOW_BATTERY_PCT = 20
export const HEALTH_ROWS = ['sensors', 'camera', 'modem', 'battery', 'gps']

export function healthRows(unit) {
  const { status, health } = unit
  const lowBattery = status.faults.includes('battery') || status.battery <= LOW_BATTERY_PCT
  return {
    sensors: { ok: health.sensors === 'ok' },
    camera: { ok: health.camera === 'ok' },
    modem: { ok: status.presence !== 'offline' && health.modem === 'ok', params: { signal: status.signal }, variant: status.presence === 'parked' ? 'parked' : null },
    battery: { ok: !lowBattery, params: { battery: status.battery } },
    gps: { ok: status.gps === 'good' },
  }
}

export const healthIssues = (unit) => {
  const rows = healthRows(unit)
  return HEALTH_ROWS.filter((id) => !rows[id].ok)
}
