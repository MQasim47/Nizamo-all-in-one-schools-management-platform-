import Link from 'next/link'
import { Download } from 'lucide-react'
import WaitlistTable from '@/components/admin/WaitlistTable'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import { requireSession } from '@/lib/auth/session'
import { listWaitlist } from '@/lib/db/admin/waitlist'
import { WAITLIST_STATUSES } from '@/lib/waitlist-options'
import { formatNumber } from '@/lib/utils/money.mjs'

export const metadata = { title: 'Waitlist' }

const control =
  'h-10 rounded-ctl border border-line-strong bg-surface px-3 text-body text-ink transition-[border-color,box-shadow] duration-150 ease-out hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-soft'

export default async function WaitlistPage(props) {
  const searchParams = await props.searchParams
  const session = await requireSession()
  const status = WAITLIST_STATUSES.includes(searchParams?.status) ? searchParams.status : ''
  const q = (searchParams?.q || '').toString().slice(0, 60)

  const rows = await listWaitlist(session, { status, q })
  const exportQuery = new URLSearchParams({ ...(status && { status }), ...(q && { q }) }).toString()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Founding Schools waitlist"
        description="Schools that asked to join from the website."
        actions={
          <Button href={`/admin/waitlist/export${exportQuery ? `?${exportQuery}` : ''}`} variant="secondary" leftIcon={Download} external>
            Download CSV
          </Button>
        }
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="q" className="text-label font-medium text-ink">Search</label>
          <input id="q" name="q" defaultValue={q} placeholder="School, name, city or number" className={`${control} w-72 max-w-full`} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className="text-label font-medium text-ink">Status</label>
          <select id="status" name="status" defaultValue={status} className={control}>
            <option value="">All</option>
            {WAITLIST_STATUSES.map((s) => (
              <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
        <Button type="submit">Filter</Button>
        <Link href="/admin/waitlist" className="inline-flex h-10 items-center px-2 text-body text-ink-2 transition-colors duration-150 ease-out hover:text-ink">Clear</Link>
      </form>

      <p className="text-label text-ink-3">
        {formatNumber(rows.length)} {rows.length === 1 ? 'school' : 'schools'}
      </p>
      <WaitlistTable rows={rows} />
    </div>
  )
}
