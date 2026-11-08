// What a driver can change on a unit from the app (PLAN.md Prompt 8), and how long a change takes to reach it.
export const COUNTDOWN_MIN_S = 15
export const COUNTDOWN_MAX_S = 60
export const VOLUMES = ['low', 'medium', 'high']
export const SENSITIVITIES = ['low', 'normal', 'high']
export const HOLD_DELAYS_MIN = [1, 2, 5, 10]
export const UNIT_LANGUAGES = ['en', 'fil']
export const SETTING_KEYS = ['countdownS', 'volume', 'language', 'sensitivity', 'positionReports', 'holdDelayMin']

// A change waits for the unit, then is applied. These are realistic-speed times; Quick is faster (see the actions).
export const APPLY_MS = 12000
export const UPDATE_MS = 30000
// Stages of a software update, as a share of its duration.
export const UPDATE_STAGES = [
  { id: 'download', until: 0.4 },
  { id: 'install', until: 0.8 },
  { id: 'restart', until: 1 },
]
export const updateStageAt = (progress) => (UPDATE_STAGES.find((stage) => progress < stage.until) ?? UPDATE_STAGES[UPDATE_STAGES.length - 1]).id

export const isCountdown = (value) => Number.isInteger(value) && value >= COUNTDOWN_MIN_S && value <= COUNTDOWN_MAX_S

// Returns the keys whose values do not make sense. An empty list means the settings can be saved.
export function invalidSettings(values) {
  const bad = []
  if (!isCountdown(values.countdownS)) bad.push('countdownS')
  if (!VOLUMES.includes(values.volume)) bad.push('volume')
  if (!UNIT_LANGUAGES.includes(values.language)) bad.push('language')
  if (!SENSITIVITIES.includes(values.sensitivity)) bad.push('sensitivity')
  if (typeof values.positionReports !== 'boolean') bad.push('positionReports')
  if (!HOLD_DELAYS_MIN.includes(values.holdDelayMin)) bad.push('holdDelayMin')
  return bad
}

export const pickSettings = (content) => Object.fromEntries(SETTING_KEYS.map((key) => [key, content[key]]))
export const changedSettingKeys = (from, to) => SETTING_KEYS.filter((key) => from[key] !== to[key])
