import { NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/session'
import { ForbiddenError } from '@/lib/db/admin/schools'
import { updateWaitlistStatus } from '@/lib/db/admin/waitlist'

export async function PATCH(request, props) {
  const params = await props.params;
  const { session, error } = await requireApiSession()
  if (error) return error

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 })
  }

  try {
    await updateWaitlistStatus(session, params.id, body?.status)
    return NextResponse.json({ ok: true })
  } catch (e) {
    if (e instanceof ForbiddenError) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    if (e?.name === 'ZodError') return NextResponse.json({ error: 'validation' }, { status: 400 })
    return NextResponse.json({ error: 'server' }, { status: 500 })
  }
}
