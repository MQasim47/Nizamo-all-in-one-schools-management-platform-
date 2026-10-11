import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Root domain that schools hang off (getnizamo.com -> ghs.getnizamo.com). Never hardcoded.
// If unset (local dev, preview URLs) no subdomain is ever guessed from the host.
const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || '').trim().toLowerCase()
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

function readHost(req) {
  return (req.headers.get('host') || '').toLowerCase().split(':')[0]
}

// Subdomain taken from the HOST only (production). Empty on the apex/www or when no root domain.
function hostSubdomain(host) {
  if (ROOT_DOMAIN && host.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = host.slice(0, -(ROOT_DOMAIN.length + 1))
    if (sub && sub !== 'www' && !sub.includes('.')) return sub
  }
  return ''
}

// Remember "does this school exist" for a short while (per edge instance) so unknown-subdomain
// checks don't hit the database on every request.
const existsCache = new Map()
async function schoolExists(req, subdomain) {
  const hit = existsCache.get(subdomain)
  if (hit && Date.now() - hit.at < hit.ttl) return hit.exists
  let exists = true // fail open: a lookup error must not take every school offline
  try {
    const url = new URL('/api/internal/school-exists', req.url)
    url.searchParams.set('subdomain', subdomain)
    const res = await fetch(url, { headers: { 'x-nz-internal': process.env.NEXTAUTH_SECRET || '' } })
    if (res.ok) {
      exists = !!(await res.json()).exists
      existsCache.set(subdomain, { at: Date.now(), exists, ttl: exists ? 5 * 60_000 : 30_000 })
      if (existsCache.size > 500) existsCache.clear()
    }
  } catch {}
  return exists
}

export async function proxy(req) {
  const { pathname } = req.nextUrl
  const host = readHost(req)

  // www -> apex (one canonical host for the marketing site)
  if (ROOT_DOMAIN && host === `www.${ROOT_DOMAIN}`) {
    // Always https on the real domain, whatever protocol the proxy forwarded.
    return NextResponse.redirect(new URL(`${pathname}${req.nextUrl.search}`, `https://${ROOT_DOMAIN}`), 308)
  }

  const fromHost = hostSubdomain(host)
  const subdomain = LOCAL_HOSTS.has(host) ? req.nextUrl.searchParams.get('school') || '' : fromHost

  // Unknown school address: a clean 404, never the marketing homepage.
  if (fromHost && !pathname.startsWith('/api/') && !pathname.startsWith('/_next')) {
    if (!(await schoolExists(req, fromHost))) {
      return NextResponse.rewrite(new URL('/school-not-found', req.url), { status: 404 })
    }
    // A school's own address has no marketing page: send / to its login.
    if (pathname === '/') return NextResponse.redirect(new URL('/login', req.url))
  }

  // Header read by server components (login page). Always overwritten, so a client can't spoof it.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-school-subdomain', subdomain)

  const isSchoolArea = pathname === '/school' || pathname.startsWith('/school/')
  const isAdminArea = pathname === '/admin' || pathname.startsWith('/admin/')
  const isPrivate = isSchoolArea || isAdminArea

  // Dashboard routes need a valid token. (Pages and route handlers ALSO re-check the session
  // server-side via lib/auth/session.js, so this is not the only gate.)
  if (isPrivate) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      const loginUrl = new URL('/login', req.url)
      if (subdomain) loginUrl.searchParams.set('school', subdomain)
      else if (isAdminArea) loginUrl.searchParams.set('school', 'admin')
      return NextResponse.redirect(loginUrl)
    }

    // /admin is for the platform super admin only (re-verified against the DB in the page).
    if (isAdminArea && token.role !== 'superadmin') {
      return NextResponse.redirect(new URL('/school/dashboard', req.url))
    }

    // A user of school A must not sit on school B's address.
    if (isSchoolArea && subdomain && token.schoolSubdomain !== subdomain) {
      return NextResponse.redirect(new URL('/signed-out?reason=wrong-school', req.url))
    }
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  // Every school address is private; only the apex marketing site is indexable.
  if (fromHost) response.headers.set('X-Robots-Tag', 'noindex, nofollow')
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
