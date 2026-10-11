import Link from 'next/link'
import Topbar from '@/components/layout/Topbar'
import WaitlistTable from '@/components/admin/WaitlistTable'
import { requireSession } from '@/lib/auth/session'
import { listWaitlist } from '@/lib/db/admin/waitlist'
import { WAITLIST_STATUSES } from '@/lib/waitlist-options'

export const metadata = { title: 'Waitlist' }

export default async function WaitlistPage(props) {
  const searchParams = await props.searchParams;
  const session = await requireSession()
  const status = WAITLIST_STATUSES.includes(searchParams?.status) ? searchParams.status : ''
  const q = (searchParams?.q || '').toString().slice(0, 60)

  const rows = await listWaitlist(session, { status, q })
  const exportQuery = new URLSearchParams({ ...(status && { status }), ...(q && { q }) }).toString()

  return (
    <>
      <Topbar title="Founding Schools waitlist" />
      <div className="p-[26px] flex-1">
        <form method="get" className="flex flex-wrap gap-2.5 items-end mb-5">
          <div>
            <label htmlFor="q" className="block text-[11px] font-semibold uppercase tracking-wide text-text-mid mb-1">Search</label>
            <input
              id="q" name="q" defaultValue={q} placeholder="School, name, city or number"
              className="px-3 py-2 border-[1.5px] border-[rgba(92,61,46,0.15)] rounded-[10px] bg-white text-sm w-64"
            />
          </div>
          <div>
            <label htmlFor="status" className="block text-[11px] font-semibold uppercase tracking-wide text-text-mid mb-1">Status</label>
            <select id="status" name="status" defaultValue={status} className="px-3 py-2 border-[1.5px] border-[rgba(92,61,46,0.15)] rounded-[10px] bg-white text-sm">
              <option value="">All</option>
              {WAITLIST_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button type="submit" className="px-4 py-2 rounded-[10px] bg-espresso text-white text-sm font-semibold">Filter</button>
          <Link href="/admin/waitlist" className="px-3 py-2 text-sm text-text-mid">Clear</Link>
          <a
            href={`/admin/waitlist/export${exportQuery ? `?${exportQuery}` : ''}`}
            className="ml-auto px-4 py-2 rounded-[10px] border-[1.5px] border-terracotta text-terracotta text-sm font-semibold no-underline"
          >
            Download CSV
          </a>
        </form>

        <p className="text-xs text-text-light mb-3">{rows.length} {rows.length === 1 ? 'school' : 'schools'}</p>
        <WaitlistTable rows={rows} />
      </div>
    </>
  )
}
