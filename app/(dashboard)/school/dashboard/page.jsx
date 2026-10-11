import { requireSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/permissions.mjs'
import { getPrincipalSummary } from '@/lib/db/dashboard'
import { listWaitlist } from '@/lib/db/admin/waitlist'
import PrincipalHome from '@/components/dashboard/PrincipalHome'
import PageHeader from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import { GlanceList } from '@/components/ui/StatCard'
import Button from '@/components/ui/Button'
import { formatHijri, formatLongPk, greetingPk } from '@/lib/utils/dates.mjs'
import { formatNumber } from '@/lib/utils/money.mjs'

export const metadata = { title: 'Dashboard' }

async function PlatformHome({ session }) {
  let waiting = null
  try {
    waiting = (await listWaitlist(session, { status: 'new' })).length
  } catch {}
  const now = new Date()
  return (
    <div className="space-y-8">
      <PageHeader
        title={`${greetingPk(now)}, ${session.user.name}`}
        description={`${formatLongPk(now)} | ${formatHijri(now)} AH`}
      />
      <Card padding={false}>
        {waiting === null ? (
          <ErrorState title="The waitlist could not be loaded" />
        ) : waiting === 0 ? (
          <EmptyState title="No new requests" description="When a school joins the waitlist from the website, it appears here." action={<Button href="/admin/waitlist" variant="secondary">Open the waitlist</Button>} />
        ) : (
          <GlanceList items={[{ label: 'New waitlist requests', value: formatNumber(waiting), detail: 'Schools waiting to hear from you', href: '/admin/waitlist', action: true }]} />
        )}
      </Card>
    </div>
  )
}

export default async function DashboardPage() {
  const session = await requireSession()
  if (session.user.role === 'superadmin') return <PlatformHome session={session} />

  const summary = await getPrincipalSummary(session)
  return (
    <PrincipalHome
      name={session.user.name}
      glance={summary.glance}
      glanceFailed={summary.glanceFailed}
      activity={summary.activity}
      activityFailed={summary.activityFailed}
      showActivity={summary.canSeeActivity}
      checklist={can(session.user.role, 'settings.write') ? summary.checklist : undefined}
      hijriOffset={summary.settings.hijriOffset}
    />
  )
}
