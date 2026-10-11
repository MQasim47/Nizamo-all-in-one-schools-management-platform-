// Pakistani mobile numbers -> E.164 (+923XXXXXXXXX). Returns null if it is not a valid PK mobile.
// Accepts 03xx..., 3xx..., 923xx..., +923xx..., 00923xx..., with spaces/dashes/brackets.
export function normalisePkMobile(input) {
  if (typeof input !== 'string') return null
  let d = input.replace(/[^\d+]/g, '')
  if (d.startsWith('+')) d = d.slice(1)
  else if (d.startsWith('00')) d = d.slice(2)
  d = d.replace(/\D/g, '')

  if (d.startsWith('92')) d = d.slice(2)
  else if (d.startsWith('0')) d = d.slice(1)

  // Mobile numbers: 3XX XXXXXXX = 10 digits starting with 3
  if (!/^3\d{9}$/.test(d)) return null
  return `+92${d}`
}
