import { requireSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/permissions.mjs'
import { getShellSettings } from '@/lib/db/dashboard'
import PageHeader from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import HijriSettingsForm from '@/components/school/HijriSettingsForm'

export const metadata = { title: 'School settings' }

export default async function SettingsPage() {
  const session = await requireSession({ permission: 'settings.read' })
  const settings = await getShellSettings(session)
  return (
    <div className="space-y-8">
      <PageHeader title="School settings" description="Details that apply to your whole school." />
      <Card className="max-w-2xl">
        <CardHeader title="Calendar" description="How dates appear on your dashboard and printouts." />
        <div className="mt-5">
          <HijriSettingsForm initial={settings.hijriOffset} canEdit={can(session.user.role, 'settings.write')} />
        </div>
      </Card>
    </div>
  )
}
