import { headers } from 'next/headers'
import { detectSchoolBySubdomain } from '@/lib/db/admin/schools'
import { subdomainSchema } from '@/lib/validation/auth'
import { ROOT_DOMAIN } from '@/lib/site'
import LoginForm from './LoginForm'

export const metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
}

// Demo shortcuts exist only when NEXT_PUBLIC_DEMO_MODE=true. Passwords come from server-only
// env vars (set by scripts/set-demo-passwords.mjs) and are passed down only in demo mode, so a
// production build never contains them. The superadmin shortcut is never offered in production.
function demoAccounts(subdomain) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return []

  if (subdomain === 'admin') {
    if (process.env.NODE_ENV === 'production' || !process.env.DEMO_PASSWORD_SUPERADMIN) return []
    return [{ label: 'Super Admin', email: 'admin@edu4everyone.com', password: process.env.DEMO_PASSWORD_SUPERADMIN }]
  }

  if (subdomain === 'ghs') {
    return [
      { label: 'Principal', email: 'principal@ghs.com', password: process.env.DEMO_PASSWORD_PRINCIPAL },
      { label: 'Teacher', email: 'ahmed@ghs.com', password: process.env.DEMO_PASSWORD_TEACHER },
    ].filter((a) => a.password)
  }
  return []
}

export default async function LoginPage({ searchParams }) {
  // The middleware derives the school from the host (or ?school= on localhost) and sets this
  // header; ?school= is also accepted when the app is served from the root domain.
  const raw = headers().get('x-school-subdomain') || searchParams?.school || ''
  const parsed = subdomainSchema.safeParse(raw)
  const subdomain = parsed.success ? parsed.data : ''

  const school = subdomain ? await detectSchoolBySubdomain(subdomain) : null

  return (
    <LoginForm
      subdomain={subdomain}
      schoolName={school?.school_name || 'Nizamo'}
      schoolFound={!!school}
      demo={school ? demoAccounts(subdomain) : []}
      rootDomain={ROOT_DOMAIN}
    />
  )
}
