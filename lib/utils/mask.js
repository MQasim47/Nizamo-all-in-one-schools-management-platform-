// Sensitive fields are masked in lists and shown in full only on a detail page.

// 4210112345673 / 42101-1234567-3 -> 42101-*****-3
export function maskCnic(value) {
  if (!value) return ''
  const d = String(value).replace(/\D/g, '')
  if (d.length < 6) return '*****'
  return `${d.slice(0, 5)}-*****-${d.slice(-1)}`
}

// 03001234567 -> 0300-***-4567
export function maskPhone(value) {
  if (!value) return ''
  const d = String(value).replace(/\D/g, '')
  if (d.length < 8) return '***'
  return `${d.slice(0, 4)}-***-${d.slice(-4)}`
}

export function maskAddress(value) {
  if (!value) return ''
  const s = String(value)
  return s.length <= 6 ? '***' : `${s.slice(0, 6)}…`
}
