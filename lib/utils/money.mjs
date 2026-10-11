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

/** 1840000 -> "Rs. 18,40,000". */
export function formatRs(value) {
  const s = formatNumber(value)
  return s.startsWith('-') ? `-Rs. ${s.slice(1)}` : `Rs. ${s}`
}
