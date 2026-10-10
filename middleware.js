import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Root domain that schools hang off, e.g. "nizamo.com" -> ghs.nizamo.com.
// If unset (local dev, preview URLs) no subdomain is ever guessed from the host.
const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || '').toLowerCase()
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1'])

function detectSubdomain(req) {
  const host = (req.headers.get('host') || '').toLowerCase().split(':')[0]

  // Local development: exact localhost only, school chosen with ?school=
  if (LOCAL_HOSTS.has(host)) return req.nextUrl.searchParams.get('school') || ''

  if (ROOT_DOMAIN && host.endsWith(`.${ROOT_DOMAIN}`)) {
    const sub = host.slice(0, -(ROOT_DOMAIN.length + 1))
    if (sub && sub !== 'www' && !sub.includes('.')) return sub
  }
  return ''
}

export async function middleware(req) {
  const { pathname } = req.nextUrl
  const subdomain = detectSubdomain(req)

  // Header read by server components (login page). Always overwritten, so a client can't spoof it.
  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-school-subdomain', subdomain)

  // Dashboard routes need a valid token. (Pages and route handlers ALSO re-check the session
  // server-side via lib/auth/session.js, so this is not the only gate.)
  if (pathname.startsWith('/school')) {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })

    if (!token) {
      const loginUrl = new URL('/login', req.url)
      if (subdomain) loginUrl.searchParams.set('school', subdomain)
      return NextResponse.redirect(loginUrl)
    }

    // A user of school A must not sit on school B's address.
    if (subdomain && token.schoolSubdomain !== subdomain) {
      return NextResponse.redirect(new URL('/signed-out?reason=wrong-school', req.url))
    }
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
