import { NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/session'
import { ForbiddenError } from '@/lib/db/admin/schools'
import { listWaitlist, waitlistToCsv } from '@/lib/db/admin/waitlist'

export async function GET(request) {
  const { session, error } = await requireApiSession()
  if (error) return error
  const sp = new URL(request.url).searchParams

  try {
    const rows = await listWaitlist(session, { status: sp.get('status'), q: sp.get('q') })
    return new NextResponse(waitlistToCsv(rows), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="nizamo-waitlist-${new Date().toISOString().slice(0, 10)}.csv"`,
        'cache-control': 'no-store',
      },
    })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }
}
