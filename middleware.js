import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/api/auth', '/api/schools/check']

export async function middleware(req) {
  const { pathname } = req.nextUrl
  const hostname = req.headers.get('host') || ''

  // ============================================
  // 1. SUBDOMAIN DETECTION
  // e.g. ghs.edu4everyone.com -> "ghs"
  // On localhost, use ?school= query param instead
  // ============================================
  let subdomain = ''
  const parts = hostname.split('.')

  if (hostname.includes('localhost')) {
    subdomain = req.nextUrl.searchParams.get('school') || ''
  } else if (parts.length >= 3 && parts[0] !== 'www') {
    subdomain = parts[0]
  }

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-school-subdomain', subdomain)

  // ============================================
  // 2. AUTH PROTECTION for dashboard routes
  // ============================================
  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route))
  const isDashboardRoute = pathname.startsWith('/school')

  if (isDashboardRoute && !isPublicRoute) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (!token) {
      const loginUrl = new URL('/login', req.url)
      if (subdomain) loginUrl.searchParams.set('school', subdomain)
      return NextResponse.redirect(loginUrl)
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
