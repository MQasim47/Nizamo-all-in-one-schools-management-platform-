import { requireSession } from '@/lib/auth/session'
import { getShellSettings } from '@/lib/db/dashboard'
import { buildNav } from '@/lib/nav.mjs'
import { titleCase } from '@/lib/utils/format'
import SchoolShell from '@/components/shell/SchoolShell'

// Dashboard pages are private: never index them.
export const metadata = {
  robots: { index: false, follow: false, nocache: true },
}

export default async function SchoolLayout({ children }) {
  // Redirects to /login (signed out) or /signed-out (user deactivated / school suspended).
  const session = await requireSession()
  const { name, email, role, schoolName } = session.user
  const isSuper = role === 'superadmin'

  // The shell never blocks a page: if settings cannot be read it falls back to plain defaults.
  let settings = { academicYear: null, logoUrl: null }
  if (!isSuper) {
    try {
      settings = await getShellSettings(session)
    } catch {}
  }

  return (
    <SchoolShell
      brand={isSuper ? { name: 'Nizamo Admin', subtitle: 'Platform' } : { name: schoolName, logoUrl: settings.logoUrl }}
      nav={buildNav(role)}
      user={{ name, email, roleLabel: isSuper ? 'Platform admin' : titleCase(role) }}
      sessionLabel={settings.academicYear ? `Session ${settings.academicYear.replace('-', '–')}` : undefined}
    >
      {children}
    </SchoolShell>
  )
}
