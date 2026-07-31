import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import DashboardLayout from '@/components/layout/DashboardLayout'

export default async function SchoolLayout({ children }) {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  let pendingApprovalsCount = 0

  if (session.user.role === 'principal' || session.user.role === 'superadmin') {
    const { data } = await supabaseAdmin
      .from('results')
      .select('class_id, subject_id, exam_type')
      .eq('school_id', session.user.schoolId)
      .eq('status', 'pending')

    // Count distinct class+subject+exam combinations (matches PHP logic)
    const unique = new Set(
      (data || []).map((r) => `${r.class_id}-${r.subject_id}-${r.exam_type}`)
    )
    pendingApprovalsCount = unique.size
  }

  return (
    <DashboardLayout pendingApprovalsCount={pendingApprovalsCount}>
      {children}
    </DashboardLayout>
  )
}
