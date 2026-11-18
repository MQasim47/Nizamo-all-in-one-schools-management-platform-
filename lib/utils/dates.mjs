// Pakistan-time date helpers (audit M8: never use UTC dates for school days).
const TZ = 'Asia/Karachi'

/** Pakistan's moon sighting usually puts the Hijri date one day behind the Umm al-Qura tables. */
export const DEFAULT_HIJRI_OFFSET = -1

export function clampHijriOffset(v) {
  const n = Number(v)
  return Number.isInteger(n) && n >= -2 && n <= 2 ? n : DEFAULT_HIJRI_OFFSET
}

/** "Saturday, 11 October 2026" in Pakistan time. */
export function formatLongPk(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

/**
 * Islamic date, e.g. "18 Rabi al-Thani 1448" (Umm al-Qura tables) shifted by the school's
 * `offsetDays` (-2..+2).
 */
export function formatHijri(date = new Date(), offsetDays = DEFAULT_HIJRI_OFFSET) {
  const d = new Date(date.getTime() + clampHijriOffset(offsetDays) * 86400000)
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(d)
  const get = (t) => parts.find((p) => p.type === t)?.value || ''
  return `${get('day')} ${get('month')} ${get('year').replace(/\D/g, '')}`
}

/** "Good morning" / "Good afternoon" / "Good evening" in Pakistan time. */
export function greetingPk(date = new Date()) {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', hour12: false }).format(date)) % 24
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

/** "2026-10-11" for the school day in Pakistan (for DATE columns). */
export function todayPk(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** true for a real calendar date written "YYYY-MM-DD" (rejects 2026-02-30). */
export function isValidDate(s) {
  const m = typeof s === 'string' && DATE_RE.exec(s)
  if (!m) return false
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]
}

/** The Pakistan calendar date of a timestamp: "2026-10-11" (a timestamp at 23:30 UTC is the next day in PK). */
export function toPkDate(timestamp) {
  const d = timestamp instanceof Date ? timestamp : new Date(timestamp)
  if (Number.isNaN(d.getTime())) throw new RangeError('Invalid timestamp')
  return todayPk(d)
}

/** "2026-02-28" + 1 -> "2026-03-01". Pure calendar arithmetic (Pakistan has no DST). */
export function addDaysPk(dateStr, days) {
  if (!isValidDate(dateStr)) throw new RangeError('Invalid date')
  const [y, m, d] = dateStr.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + Number(days)))
  return `${String(t.getUTCFullYear()).padStart(4, '0')}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`
}

/**
 * The UTC instants that bound one Pakistan school day, for querying timestamptz columns:
 * pkDayRange('2026-10-11') -> { start: '2026-10-10T19:00:00.000Z', end: '2026-10-11T19:00:00.000Z' }
 * (use created_at >= start AND created_at < end). Pakistan is UTC+5 all year.
 */
export function pkDayRange(dateStr) {
  if (!isValidDate(dateStr)) throw new RangeError('Invalid date')
  const [y, m, d] = dateStr.split('-').map(Number)
  const start = new Date(Date.UTC(y, m - 1, d) - 5 * 3600 * 1000)
  return { start: start.toISOString(), end: new Date(start.getTime() + 86400000).toISOString() }
}

/** "2026-10-01": first day of the current month in Pakistan. */
export function monthStartPk(date = new Date()) {
  return todayPk(date).slice(0, 8) + '01'
}

/** "12 minutes ago", "Today, 9:05 am", "Yesterday, 2:40 pm", "3 Oct, 11:15 am" (Pakistan time). */
export function formatWhenPk(iso, now = new Date()) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const mins = Math.round((now - d) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', minute: '2-digit', hour12: true }).format(d).replace(/\s?(am|pm)/i, (m) => ' ' + m.trim().toLowerCase())
  const dayOf = (x) => todayPk(x)
  if (dayOf(d) === dayOf(now)) return `Today, ${time}`
  if (dayOf(d) === dayOf(new Date(now.getTime() - 86400000))) return `Yesterday, ${time}`
  const date = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: 'numeric', month: 'short' }).format(d)
  return `${date}, ${time}`
}
