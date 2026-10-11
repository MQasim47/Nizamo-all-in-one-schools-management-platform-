// One place for site-wide constants. The domain is NEVER hardcoded: everything derives from
// NEXT_PUBLIC_ROOT_DOMAIN (e.g. getnizamo.com). Empty in local development.

export const SITE_NAME = 'Nizamo'
export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || '').trim().toLowerCase()
export const SIGNUP_OPEN = process.env.NEXT_PUBLIC_SIGNUP_OPEN === 'true'
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || ''
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || ''

// https://getnizamo.com in production, http://localhost:3000 when no root domain is configured.
export function siteUrl() {
  return ROOT_DOMAIN ? `https://${ROOT_DOMAIN}` : 'http://localhost:3000'
}

// https://ghs.getnizamo.com (or localhost with ?school= in development)
export function schoolUrl(subdomain) {
  return ROOT_DOMAIN ? `https://${subdomain}.${ROOT_DOMAIN}` : `http://localhost:3000/?school=${subdomain}`
}

export function whatsappLink(text = '') {
  const digits = WHATSAPP_NUMBER.replace(/\D/g, '')
  if (!digits) return ''
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

// Where every "Get started" button goes: the waitlist while signup is closed.
export const PRIMARY_CTA_HREF = SIGNUP_OPEN ? '/register' : '/#waitlist'
export const PRIMARY_CTA_LABEL = SIGNUP_OPEN ? 'Register your school' : 'Join the Founding Schools waitlist'

// Fill these in before launch. They render, clearly marked, on /privacy and /terms.
export const LEGAL = {
  operatorName: 'TODO: operator legal name',
  operatorAddress: 'TODO: registered address',
  lastUpdated: 'Draft',
}
