import { SIGNUP_OPEN, siteUrl } from '@/lib/site'

// Marketing pages only. Dashboards, /admin, /login, /api and school subdomains are never listed.
export default function sitemap() {
  const base = siteUrl()
  const lastModified = new Date()
  const pages = [
    { path: '/', priority: 1 },
    { path: '/privacy', priority: 0.3 },
    { path: '/terms', priority: 0.3 },
  ]
  // /register is a real page only when signup is open; otherwise it points at the waitlist.
  if (SIGNUP_OPEN) pages.splice(1, 0, { path: '/register', priority: 0.8 })
  return pages.map((p) => ({ url: `${base}${p.path === '/' ? '' : p.path}`, lastModified, priority: p.priority }))
}
