// One shared formatter for numbers and money, Pakistani digit grouping: 1,840,000 -> "18,40,000".
// Used everywhere (tables, stats, receipts) so the same amount never looks two ways.

function group(intStr) {
  if (intStr.length <= 3) return intStr
  const last3 = intStr.slice(-3)
  const rest = intStr.slice(0, -3)
  return rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + last3
}

/** 1840000 -> "18,40,000". Decimals only when present (max 2). Bad input -> "0". */
export function formatNumber(value) {
  const n = Number(value)
  if (value === null || value === undefined || value === '' || !Number.isFinite(n)) return '0'
  const neg = n < 0 ? '-' : ''
  const [int, dec] = Math.abs(n).toFixed(2).split('.')
  return neg + group(int) + (dec === '00' ? '' : '.' + dec)
}

// ---------------------------------------------------------------------------
// Money is WHOLE RUPEES (integers; Postgres `bigint`). Never floats, never paisa.
// ---------------------------------------------------------------------------

/**
 * THE money formatter: 1840000 -> "Rs. 18,40,000". Always whole rupees; a fractional value (which
 * should never exist) is rounded half away from zero so it can't print as "Rs. 6,500.50".
 */
export function formatRs(value) {
  const n = Number(typeof value === 'bigint' ? value.toString() : value)
  const whole = Number.isFinite(n) ? Math.sign(n) * Math.round(Math.abs(n)) : 0
  const s = formatNumber(whole)
  return s.startsWith('-') ? `-Rs. ${s.slice(1)}` : `Rs. ${s}`
}

/**
 * Normalises a money value from the database or code to a safe integer number of rupees.
 * Accepts integers, bigint and integer strings (node-postgres returns bigint as a string).
 * Throws TypeError for anything else (fractions, NaN, overflow) so bugs are loud.
 */
export function toRupees(value) {
  let n
  if (typeof value === 'bigint') n = Number(value)
  else if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) n = Number(value.trim())
  else if (typeof value === 'number') n = value
  else throw new TypeError('Money must be whole rupees')
  if (!Number.isSafeInteger(n)) throw new TypeError('Money must be whole rupees')
  return n
}

/** Adds whole-rupee amounts exactly. */
export function sumRupees(values) {
  return values.reduce((total, v) => {
    const next = total + toRupees(v)
    if (!Number.isSafeInteger(next)) throw new RangeError('Money total out of range')
    return next
  }, 0)
}
