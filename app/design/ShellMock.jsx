'use client'

import { useState } from 'react'
import { CalendarCheck, Banknote, FileBadge, UserPlus } from 'lucide-react'
import AppShell from '@/components/shell/AppShell'
import PrincipalHome from '@/components/dashboard/PrincipalHome'
import PageHeader from '@/components/ui/PageHeader'
import DataTable from '@/components/ui/DataTable'
import EmptyState from '@/components/ui/EmptyState'
import Button from '@/components/ui/Button'
import Badge, { statusTone } from '@/components/ui/Pill'
import { Input } from '@/components/ui/FormControl'
import { Card } from '@/components/ui/Card'
import { notify } from '@/components/ui/Toast'
import { ACTIVITY, GLANCE, NAV_PRINCIPAL, NAV_SUPERADMIN, PRINCIPAL, SCHOOL, STUDENTS, WAITLIST } from './sample-data'

const ACTIONS = [
  { label: 'Add student', icon: UserPlus },
  { label: 'Mark attendance', icon: CalendarCheck },
  { label: 'Issue SLC', icon: FileBadge },
  { label: 'Collect fee', icon: Banknote },
]

function StudentsView() {
  const [q, setQ] = useState('')
  const rows = STUDENTS.filter((s) => (s.name + s.gr + s.cls).toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="space-y-6">
      <PageHeader title="Students" description="Everyone currently enrolled. Click a column heading to sort." actions={<Button leftIcon={UserPlus} onClick={() => notify.info('Preview only')}>Add student</Button>} />
      <div className="max-w-sm">
        <Input label="Find a student" placeholder="Name, GR number or class" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <DataTable
        caption="Students"
        initialSort={{ key: 'gr', dir: 'asc' }}
        columns={[
          { key: 'name', header: 'Student', sortable: true, primary: true },
          { key: 'gr', header: 'GR no.', sortable: true, align: 'right' },
          { key: 'cls', header: 'Class', sortable: true },
          { key: 'guardian', header: 'Guardian' },
          { key: 'phone', header: 'Phone', mobile: false },
          { key: 'fee', header: 'Fee', sortable: true, render: (r) => <Badge tone={statusTone(r.fee)} dot>{r.fee}</Badge> },
        ]}
        rows={rows}
        rowActions={(r) => [
          { label: 'View profile', onClick: () => notify.info(`Open ${r.name}`) },
          { label: 'Collect fee', onClick: () => notify.info(`Fee for ${r.name}`) },
          { label: 'Issue SLC', onClick: () => notify.info('Preview only') },
          { label: 'Remove from register', danger: true, onClick: () => notify.error('Preview only: nothing was changed') },
        ]}
        empty={<EmptyState title="No student matches" description="Try a different name, or add the student if they are new." action={<Button variant="secondary" onClick={() => setQ('')}>Clear search</Button>} />}
      />
    </div>
  )
}

function WaitlistView() {
  return (
    <div className="space-y-6">
      <PageHeader title="Waitlist" description="Schools that asked to join from the website." actions={<Button variant="secondary" onClick={() => notify.info('Preview only')}>Export CSV</Button>} />
      <DataTable
        caption="Waitlist"
        columns={[
          { key: 'school', header: 'School', primary: true, sortable: true },
          { key: 'contact', header: 'Contact' },
          { key: 'city', header: 'City', sortable: true },
          { key: 'students', header: 'Students' },
          { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)} dot>{r.status}</Badge> },
        ]}
        rows={WAITLIST}
        rowActions={() => [{ label: 'Mark contacted' }, { label: 'Mark onboarded' }, { label: 'Archive', danger: true }]}
      />
    </div>
  )
}

export default function ShellMock({ mode }) {
  const [href, setHref] = useState(null)
  const admin = mode === 'superadmin'
  const nav = admin ? NAV_SUPERADMIN : NAV_PRINCIPAL
  const active = href && nav.some((g) => g.items.some((i) => i.href === href)) ? href : admin ? '/admin/waitlist' : '/school/dashboard'
  const empty = mode === 'new-school'
  const label = nav.flatMap((g) => g.items).find((i) => i.href === active)?.label

  let view
  if (active === '/school/dashboard') {
    view = <PrincipalHome name="Mrs. Nasreen" glance={empty ? [] : GLANCE} activity={empty ? [] : ACTIVITY} actions={ACTIONS} onAction={(a) => notify.info(`${a.label}: preview only`)} />
  } else if (active === '/school/students') {
    view = empty ? (
      <div className="space-y-6">
        <PageHeader title="Students" />
        <Card padding={false}>
          <EmptyState title="No students yet" description="Add your first student, or import a whole class from an Excel file." action={<Button leftIcon={UserPlus}>Add student</Button>} />
        </Card>
      </div>
    ) : (
      <StudentsView />
    )
  } else if (active === '/admin/waitlist') {
    view = <WaitlistView />
  } else {
    view = (
      <div className="space-y-6">
        <PageHeader title={label} />
        <Card padding={false}>
          <EmptyState title={`${label} is not set up yet`} description="This is an example of the empty state every page has: one plain sentence and one clear next step." action={<Button variant="secondary">Get started</Button>} />
        </Card>
      </div>
    )
  }

  return (
    <AppShell
      embedded
      brand={admin ? { name: 'Nizamo Admin' } : { name: SCHOOL.name }}
      nav={nav}
      user={admin ? { name: 'Qasim Aslam', email: 'admin@nizamo.pk', roleLabel: 'Platform admin' } : PRINCIPAL}
      sessionLabel={admin ? undefined : 'Session 2026–27'}
      activeHref={active}
      onNavigate={setHref}
      onSignOut={() => notify.info('Signed out (preview only)')}
    >
      {view}
    </AppShell>
  )
}
