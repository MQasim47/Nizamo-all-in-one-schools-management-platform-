// Pakistan-time date helpers (audit M8: never use UTC dates for school days).
const TZ = 'Asia/Karachi'

/** "Saturday, 11 October 2026" in Pakistan time. */
export function formatLongPk(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}

/**
 * Islamic date, e.g. "18 Rabi al-Thani 1448". Uses the Umm al-Qura calendar; Pakistan follows moon
 * sighting, so it can differ by a day. `offsetDays` lets a school correct that.
 */
export function formatHijri(date = new Date(), offsetDays = 0) {
  const d = new Date(date.getTime() + offsetDays * 86400000)
  const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(d)
  const get = (t) => parts.find((p) => p.type === t)?.value || ''
  return `${get('day')} ${get('month')} ${get('year').replace(/\D/g, '')}`
}

/** "Good morning" / "Good afternoon" / "Good evening" in Pakistan time. */
export function greetingPk(date = new Date()) {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: 'numeric', hour12: false }).format(date)) % 24
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}
