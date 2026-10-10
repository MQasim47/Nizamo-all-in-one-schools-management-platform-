import { requireSession } from '@/lib/auth/session'
import { getSchoolClient } from '@/lib/supabase/school'
import { can } from '@/lib/auth/permissions.mjs'
import DashboardLayout from '@/components/layout/DashboardLayout'

// Dashboard pages are private: never index them.
export const metadata = {
  robots: { index: false, follow: false, nocache: true },
}

export default async function SchoolLayout({ children }) {
  // Redirects to /login (signed out) or /signed-out (user deactivated / school suspended).
  const session = await requireSession()

  let pendingApprovalsCount = 0

  if (can(session.user.role, 'results.approve')) {
    const ctx = await getSchoolClient(session)
    const { data } = await ctx.db
      .from('results')
      .select('class_id, subject_id, exam_type')
      .eq('status', 'pending')

    // Count distinct class+subject+exam combinations (matches PHP logic)
    const unique = new Set((data || []).map((r) => `${r.class_id}-${r.subject_id}-${r.exam_type}`))
    pendingApprovalsCount = unique.size
  }

  return (
    <DashboardLayout pendingApprovalsCount={pendingApprovalsCount}>
      {children}
    </DashboardLayout>
  )
}
