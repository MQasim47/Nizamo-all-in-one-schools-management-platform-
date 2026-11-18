import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { assertSuperadmin, ForbiddenError } from '@/lib/db/admin/schools'
import { buildNav } from '@/lib/nav.mjs'
import SchoolShell from '@/components/shell/SchoolShell'

// Platform super-admin area. Never indexed.
export const metadata = {
  title: 'Admin',
  robots: { index: false, follow: false, nocache: true },
}

export default async function AdminLayout({ children }) {
  const session = await requireSession()
  try {
    await assertSuperadmin(session) // checked against the database, not just the token
  } catch (e) {
    if (e instanceof ForbiddenError) redirect('/school/dashboard')
    throw e
  }
  const { name, email } = session.user
  return (
    <SchoolShell brand={{ name: 'Nizamo Admin', subtitle: 'Platform', mark: 'nizamo' }} nav={buildNav('superadmin')} user={{ name, email, roleLabel: 'Platform admin' }}>
      {children}
    </SchoolShell>
  )
}
