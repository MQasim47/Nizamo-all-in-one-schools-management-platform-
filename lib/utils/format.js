import { format, parseISO, isValid } from 'date-fns'

// ============================================
// Date formatting helpers
// ============================================

export function formatDate(date, pattern = 'MMM d, yyyy') {
  if (!date) return '—'
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return '—'
    return format(d, pattern)
  } catch {
    return '—'
  }
}

export function formatDateLong(date) {
  return formatDate(date, 'EEEE, MMMM d, yyyy')
}

export function formatDateForInput(date) {
  if (!date) return ''
  try {
    const d = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(d)) return ''
    return format(d, 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

export function todayForInput() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function currentAcademicYear() {
  const now = new Date()
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  return `${year}-${year + 1}`
}

// ============================================
// Number / currency formatting
// ============================================

export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return 'Rs. 0'
  return `Rs. ${Number(amount).toLocaleString('en-PK')}`
}

export function formatNumber(num) {
  if (num === null || num === undefined) return '0'
  return Number(num).toLocaleString('en-PK')
}

// ============================================
// Text helpers
// ============================================

export function initials(name) {
  if (!name) return '??'
  return name.trim().substring(0, 2).toUpperCase()
}

export function titleCase(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

export function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .substring(0, 20)
}

// Generate a unique receipt number for fee payments
export function generateReceiptNumber() {
  const now = new Date()
  const datePart = format(now, 'yyMMdd')
  const randomPart = Math.floor(1000 + Math.random() * 9000)
  return `RC-${datePart}-${randomPart}`
}
