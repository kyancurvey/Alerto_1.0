// Times are shown in Asia/Manila, 12-hour, and relative where natural ("5 min. ago").
// The Philippines has no daylight saving, so the day boundary is a fixed UTC+8 offset.
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

export const manilaDayStart = (now) => Math.floor((now + MANILA_OFFSET_MS) / DAY_MS) * DAY_MS - MANILA_OFFSET_MS

const localeOf = (language) => (language === 'fil' ? 'fil-PH' : 'en-PH')

export const formatClock = (ms, language) =>
  new Intl.DateTimeFormat(localeOf(language), { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }).format(ms)

// Weekday, date and time, for an event: "Mon, Nov 2, 4:12 AM".
export const formatDayTime = (ms, language) =>
  new Intl.DateTimeFormat(localeOf(language), { timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).format(ms)

// "just now", "12 sec. ago", "5 min. ago", "3 hr. ago", "2 days ago". `justNow` is the translated text for under 10 seconds.
export function formatRelative(ms, now, language, justNow) {
  const seconds = Math.max(0, Math.round((now - ms) / 1000))
  if (seconds < 10) return justNow
  const formatter = new Intl.RelativeTimeFormat(localeOf(language), { numeric: 'always', style: 'short' })
  if (seconds < 60) return formatter.format(-seconds, 'second')
  if (seconds < 3600) return formatter.format(-Math.floor(seconds / 60), 'minute')
  if (seconds < 86400) return formatter.format(-Math.floor(seconds / 3600), 'hour')
  return formatter.format(-Math.floor(seconds / 86400), 'day')
}

// Elapsed time as m:ss, for a running alert.
export function formatElapsed(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

// Day heading in a list: "Monday, November 2".
export const formatDayHeading = (ms, language) =>
  new Intl.DateTimeFormat(localeOf(language), { timeZone: 'Asia/Manila', weekday: 'long', month: 'long', day: 'numeric' }).format(ms)

// Date and time for a spreadsheet: "2026-11-02 04:12:09" (Asia/Manila, 24-hour, sorts correctly).
export const formatSheetTime = (ms) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(ms)

// Date only, for a file name: "2026-11-02".
export const formatSheetDate = (ms) =>
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms)
