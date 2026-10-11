'use client'

import { useState } from 'react'
import { Plus, Download, Trash2 } from 'lucide-react'
import Logo, { LogoMark } from '@/components/ui/Logo'
import Button from '@/components/ui/Button'
import { Input, PasswordInput, Select, Textarea } from '@/components/ui/FormControl'
import { Card, CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Pill'
import Alert from '@/components/ui/Alert'
import Modal from '@/components/ui/Modal'
import Menu from '@/components/ui/Menu'
import DataTable from '@/components/ui/DataTable'
import EmptyState from '@/components/ui/EmptyState'
import PageHeader from '@/components/ui/PageHeader'
import { StatCard, GlanceList } from '@/components/ui/StatCard'
import { Skeleton, SkeletonRows, SkeletonText } from '@/components/ui/Skeleton'
import { Tabs, TabPanel } from '@/components/ui/Tabs'
import { notify } from '@/components/ui/Toast'
import LoginView from '@/components/auth/LoginView'
import ShellMock from './ShellMock'
import { GLANCE, STUDENTS } from './sample-data'

const SWATCHES = [
  ['Page', 'bg-bg', '#F5F0E8', 'text-ink'],
  ['Surface', 'bg-surface', '#FBF8F3', 'text-ink'],
  ['Sunken / sidebar', 'bg-sunken', '#EDE6D9', 'text-ink'],
  ['Line', 'bg-line', '#E4DACA', 'text-ink'],
  ['Line strong', 'bg-line-strong', '#CFC2AE', 'text-ink'],
  ['Text', 'bg-ink', '#2C1810', 'text-cream'],
  ['Text 2', 'bg-ink-2', '#5B4A3D', 'text-cream'],
  ['Text 3 (muted)', 'bg-ink-3', '#75634F', 'text-cream'],
  ['Accent', 'bg-accent', '#C4622D', 'text-white'],
  ['Accent strong (buttons)', 'bg-accent-strong', '#B5551F', 'text-white'],
  ['Accent text', 'bg-accent-text', '#A4491A', 'text-white'],
  ['Accent soft', 'bg-accent-soft', '#F2E1D3', 'text-ink'],
  ['Success', 'bg-ok', '#2F6B4F', 'text-white'],
  ['Success soft', 'bg-ok-soft', '#E1ECE4', 'text-ink'],
  ['Warning', 'bg-warn', '#80570B', 'text-white'],
  ['Warning soft', 'bg-warn-soft', '#F3E6C8', 'text-ink'],
  ['Danger', 'bg-bad', '#9E3128', 'text-white'],
  ['Danger soft', 'bg-bad-soft', '#F3DCD8', 'text-ink'],
]

function Section({ id, title, note, children }) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-line py-10">
      <h2 className="font-serif text-[22px] text-ink">{title}</h2>
      {note && <p className="mt-1 max-w-2xl text-body text-ink-3">{note}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}

function Segmented({ value, onChange, options, label }) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-ctl border border-line-strong bg-surface p-0.5">
      {options.map(([v, text]) => (
        <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v} className={`shrink-0 rounded-md px-3 py-1.5 text-label font-medium ${value === v ? 'bg-espresso text-cream' : 'text-ink-2 hover:bg-sunken'}`}>
          {text}
        </button>
      ))}
    </div>
  )
}

const SECTIONS = [
  ['tokens', 'Colour'], ['type', 'Type'], ['logo', 'Logo'], ['buttons', 'Buttons'], ['forms', 'Forms'], ['status', 'Badges & alerts'],
  ['cards', 'Cards'], ['tables', 'Tables'], ['overlays', 'Modal, menu, toast'], ['loading', 'Loading'], ['login', 'Login'], ['shell', 'Dashboard shell'],
]

export default function DesignPreview() {
  const [modal, setModal] = useState(false)
  const [tab, setTab] = useState('all')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('principal')
  const [loginState, setLoginState] = useState('idle')
  const [email, setEmail] = useState('principal@aips.edu.pk')
  const [pw, setPw] = useState('')

  function fakeLoad() {
    setLoading(true)
    setTimeout(() => setLoading(false), 1600)
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="mx-auto max-w-[1180px] px-4 pb-24 pt-8 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Logo size="lg" />
          <Badge tone="warning" dot>Development preview. Returns 404 in production.</Badge>
        </div>
        <PageHeader className="mt-8" title="Nizamo design system" description="Every building block of the app, then the dashboard shell and login screen built from them. Warm neutrals, one terracotta accent, Playfair only for page titles and big numbers, Inter for everything else." />
        <nav aria-label="Sections" className="mt-6 flex flex-wrap gap-2">
          {SECTIONS.map(([id, t]) => (
            <a key={id} href={`#${id}`} className="rounded-full border border-line-strong bg-surface px-3 py-1 text-label text-ink-2 hover:bg-sunken">{t}</a>
          ))}
        </nav>

        <Section id="tokens" title="Colour" note="Every text colour is at least 4.5:1 on the surfaces it is used on (checked). Terracotta is the only accent; success, warning and danger are muted and used only for meaning.">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SWATCHES.map(([name, cls, hex, txt]) => (
              <div key={name} className="overflow-hidden rounded-card border border-line">
                <div className={`${cls} ${txt} flex h-16 items-end p-2 text-caption font-medium`}>Aa</div>
                <div className="bg-surface p-2">
                  <p className="text-caption font-medium text-ink">{name}</p>
                  <p className="text-caption text-ink-3">{hex}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-label text-ink-3">Shape: controls 8px, cards 12px, 1px hairline borders, shadows barely there (a 1px, 5% shadow on cards; a soft shadow only on floating menus and dialogs).</p>
        </Section>

        <Section id="type" title="Type scale">
          <Card className="space-y-4">
            <div><p className="text-caption text-ink-3">Page title: Playfair 28/34</p><p className="font-serif text-title">Students of Class 7-A</p></div>
            <div><p className="text-caption text-ink-3">Big number: Playfair 32/36</p><p className="font-serif text-stat lining-nums tabular-nums">Rs. 18,40,000</p></div>
            <div><p className="text-caption text-ink-3">Section heading: Inter 18 semibold</p><p className="text-heading font-semibold">Recent activity</p></div>
            <div><p className="text-caption text-ink-3">Body: Inter 14/22 (the default)</p><p className="text-body">Fee challans for April have been generated for 1,128 students.</p></div>
            <div><p className="text-caption text-ink-3">Label: Inter 13, Caption: Inter 12</p><p className="text-label text-ink-2">Last updated by Ayesha Khan</p><p className="text-caption text-ink-3">GR number 2041</p></div>
            <div><p className="text-caption text-ink-3">Urdu (Noto Naskh)</p><p className="ur text-lead" lang="ur">خوش آمدید، اپنے اکاؤنٹ میں سائن ان کریں</p></div>
          </Card>
        </Section>

        <Section id="logo" title="Logo" note="A placeholder monogram. The real SVG logo replaces components/ui/Logo.jsx only; no page needs to change. The graduation-cap icon is gone.">
          <div className="flex flex-wrap items-center gap-8">
            <Logo size="lg" /><Logo size="md" /><Logo size="sm" /><LogoMark size="md" />
            <span className="rounded-card bg-espresso p-4"><Logo tone="light" /></span>
          </div>
        </Section>

        <Section id="buttons" title="Buttons">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button>Save changes</Button>
              <Button variant="secondary">Cancel</Button>
              <Button variant="ghost">Skip for now</Button>
              <Button variant="danger" leftIcon={Trash2}>Remove student</Button>
              <Button leftIcon={Plus}>Add student</Button>
              <Button variant="secondary" leftIcon={Download}>Export</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button><Button size="md">Medium</Button><Button size="lg">Large</Button>
              <Button loading>Saving</Button><Button disabled>Disabled</Button>
              <Button loading={loading} onClick={fakeLoad} variant="secondary">{loading ? 'Collecting…' : 'Try the loading state'}</Button>
            </div>
          </div>
        </Section>

        <Section id="forms" title="Form controls" note="Labels are always visible (never placeholder-only). Errors have an icon and words, not just a red border.">
          <div className="grid gap-5 md:grid-cols-2">
            <Input label="Student name" required placeholder="e.g. Ayesha Siddiqui" hint="As written on the B-Form." />
            <Input label="Guardian phone" required defaultValue="0300 123" error="Enter a full mobile number, like 0300 1234567." />
            <Select label="Class" defaultValue="7-A"><option>6-A</option><option>7-A</option><option>8-B</option><option>9-Science</option></Select>
            <PasswordInput label="Password" defaultValue="correct horse" hint="At least 10 characters." />
            <Textarea label="Home address" className="md:col-span-2" placeholder="House, street, area, city" />
            <Input label="Admission date" disabled defaultValue="12 April 2026" />
          </div>
        </Section>

        <Section id="status" title="Badges and alerts">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge>Draft</Badge><Badge tone="accent" dot>New</Badge><Badge tone="success" dot>Paid</Badge><Badge tone="warning" dot>Pending</Badge><Badge tone="danger" dot>Overdue</Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Alert tone="info" title="Results are visible to parents after approval">You can still edit marks until you submit them.</Alert>
              <Alert tone="success" title="Attendance saved">Class 8-B: 41 present, 2 absent. Parents of absent students were notified.</Alert>
              <Alert tone="warning" title="3 classes have not marked attendance" action={<Button size="sm" variant="secondary">Review</Button>}>It is past 10:00 am.</Alert>
              <Alert tone="danger" title="This GR number is already used">Choose a different number, or open the existing student.</Alert>
            </div>
          </div>
        </Section>

        <Section id="cards" title="Cards, stat cards and the glance list" note="The dashboard uses one briefing list instead of a row of identical KPI boxes. Stat cards remain available for single figures.">
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard label="Students enrolled" value="1,200" detail="46 joined this term" href="#cards" />
            <StatCard label="Fee collected" value="77%" progress={77} tone="accent" detail="Rs. 18,40,000 of Rs. 24,00,000" />
            <StatCard label="Attendance today" value="94%" progress={94} tone="success" detail="1,128 present" />
          </div>
          <Card padding={false} className="mt-6">
            <div className="border-b border-line px-5 py-4"><CardHeader title="Today at a glance" description="Each row opens the place where you act on it." action={<Button size="sm" variant="ghost">View all</Button>} /></div>
            <GlanceList items={GLANCE.slice(0, 3)} />
          </Card>
        </Section>

        <Section id="tables" title="Tabs and data table" note="Sort by clicking a heading (keyboard works). On phones each row becomes a small card. Open the ... menu on a row for actions.">
          <Tabs tabs={[{ id: 'all', label: 'All students', count: 6 }, { id: 'dues', label: 'With dues', count: 3 }, { id: 'new', label: 'New this term' }]} value={tab} onChange={setTab} idBase="demo" />
          <TabPanel id="all" value={tab} idBase="demo" className="pt-5">
            <DataTable
              caption="All students"
              initialSort={{ key: 'name', dir: 'asc' }}
              columns={[
                { key: 'name', header: 'Student', sortable: true, primary: true },
                { key: 'gr', header: 'GR no.', sortable: true, align: 'right' },
                { key: 'cls', header: 'Class', sortable: true },
                { key: 'guardian', header: 'Guardian' },
                { key: 'fee', header: 'Fee', render: (r) => <Badge tone={r.fee === 'Paid' ? 'success' : r.fee === 'Overdue' ? 'danger' : 'warning'} dot>{r.fee}</Badge> },
              ]}
              rows={STUDENTS}
              rowActions={(r) => [{ label: 'View profile', onClick: () => notify.info(r.name) }, { label: 'Remove', danger: true, onClick: () => notify.error('Preview only') }]}
            />
          </TabPanel>
          <TabPanel id="dues" value={tab} idBase="demo" className="pt-5">
            <DataTable columns={[{ key: 'name', header: 'Student' }, { key: 'fee', header: 'Fee' }]} rows={[]} empty={<EmptyState title="No dues" description="Every family is paid up. Nice." />} />
          </TabPanel>
          <TabPanel id="new" value={tab} idBase="demo" className="pt-5">
            <Card padding={false}><EmptyState title="No new students this term" description="When you admit a student, they will appear here." action={<Button leftIcon={Plus}>Add student</Button>} /></Card>
          </TabPanel>
        </Section>

        <Section id="overlays" title="Modal, menu and toast">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => setModal(true)}>Open a confirm dialog</Button>
            <Menu label="More" trigger={<span className="inline-flex h-10 items-center rounded-ctl border border-line-strong bg-surface px-4 text-body font-medium">Menu</span>} items={[{ label: 'Download register' }, { label: 'Print class list' }, { label: 'Archive class', danger: true }]} align="start" />
            <Button variant="secondary" onClick={() => notify.success('Attendance saved for Class 8-B')}>Success toast</Button>
            <Button variant="secondary" onClick={() => notify.error('Could not save. Check your connection and try again.')}>Error toast</Button>
            <Button variant="secondary" onClick={() => notify.info('Fee challans are being prepared')}>Info toast</Button>
          </div>
          <Modal
            isOpen={modal}
            onClose={() => setModal(false)}
            title="Remove Hamza Qureshi from the register?"
            description="He will be hidden from class lists. You can restore him later from Removed students."
            actions={<><Button variant="secondary" onClick={() => setModal(false)}>Keep student</Button><Button variant="danger" onClick={() => { setModal(false); notify.success('Preview only: nothing was changed') }}>Remove</Button></>}
          >
            His fee history and results are kept.
          </Modal>
        </Section>

        <Section id="loading" title="Loading states">
          <div className="grid gap-4 md:grid-cols-2">
            <Card><Skeleton className="h-4 w-32" /><Skeleton className="mt-3 h-8 w-24" /><SkeletonText className="mt-4" lines={2} /></Card>
            <Card padding={false}><SkeletonRows rows={4} /></Card>
          </div>
        </Section>

        <Section id="login" title="Login screen" note="Per-school sign-in. Use the buttons to see each state. On a phone the identity moves above the form.">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Segmented label="Login state" value={loginState} onChange={setLoginState} options={[['idle', 'Normal'], ['invalid', 'Wrong password'], ['locked', 'Locked'], ['loading', 'Signing in'], ['notfound', 'Unknown school']]} />
          </div>
          <div className="overflow-hidden rounded-card border border-line-strong">
            <LoginView
              embedded
              schoolName="Allama Iqbal Public School"
              addressLabel="aips.nizamo.pk"
              schoolFound={loginState !== 'notfound'}
              email={email}
              password={pw}
              onEmail={setEmail}
              onPassword={setPw}
              onSubmit={(e) => { e.preventDefault(); notify.info('Preview only') }}
              loading={loginState === 'loading'}
              error={loginState === 'invalid' || loginState === 'locked' ? loginState : null}
            />
          </div>
        </Section>

        <Section id="shell" title="Dashboard shell with sample data" note="Click the sidebar items. Collapse the sidebar with the panel icon (desktop). Press Ctrl/Cmd+K for the search stub. Resize the browser to 360px for the drawer.">
          <div className="mb-4">
            <Segmented label="Preview as" value={mode} onChange={setMode} options={[['principal', 'Principal'], ['new-school', 'Principal, new school (empty)'], ['superadmin', 'Super admin']]} />
          </div>
          <ShellMock key={mode} mode={mode} />
        </Section>
      </div>
    </div>
  )
}
