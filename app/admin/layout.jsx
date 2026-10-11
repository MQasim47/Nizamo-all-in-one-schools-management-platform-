import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth/session'
import { assertSuperadmin, ForbiddenError } from '@/lib/db/admin/schools'
import DashboardLayout from '@/components/layout/DashboardLayout'

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
  return <DashboardLayout>{children}</DashboardLayout>
}
