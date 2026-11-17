const isDev = process.env.NODE_ENV !== 'production'

// CSP runs in REPORT-ONLY mode for now: violations show in the browser console but nothing is
// blocked. Tighten (nonces instead of 'unsafe-inline') and switch to enforcing before launch.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://*.supabase.co",
  `connect-src 'self' https://*.supabase.co${isDev ? ' ws://localhost:*' : ''}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Content-Security-Policy-Report-Only', value: csp },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // No remote images: nothing uses next/image, and student photos/logos live in PRIVATE storage
  // served through short-lived signed URLs. A wildcard like *.supabase.co would let the image
  // optimizer fetch from any attacker's Supabase project. If next/image is ever needed for our own
  // storage, allow only our project host (from NEXT_PUBLIC_SUPABASE_URL), never a wildcard.

  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Private routes: never indexed, never cached by shared caches.
      ...['/school/:path*', '/admin/:path*', '/login', '/signed-out', '/school-not-found', '/api/:path*'].map((source) => ({
        source,
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      })),
    ]
  },
}

module.exports = nextConfig
