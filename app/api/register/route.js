import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { registerFormSchema } from '@/lib/validation/register'
import { registerSchool } from '@/lib/db/admin/schools'
import { clientIp, isRateLimited } from '@/lib/utils/rate-limit'

// Self-service school registration. Closed unless NEXT_PUBLIC_SIGNUP_OPEN=true.
// Creates school + principal + settings atomically via register_school() (migration 002).
export async function POST(request) {
  if (process.env.NEXT_PUBLIC_SIGNUP_OPEN !== 'true') {
    return NextResponse.json({ ok: false, error: 'closed' }, { status: 403 })
  }
  if (isRateLimited(`register:${clientIp(request)}`, { limit: 5, windowMs: 60 * 60 * 1000 })) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }
  if (!request.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 415 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }
  if (body && typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ ok: true }) // honeypot
  }

  const parsed = registerFormSchema.safeParse(body)
  if (!parsed.success) {
    const errors = {}
    for (const issue of parsed.error.issues) errors[issue.path[0] ?? 'form'] ??= issue.message
    return NextResponse.json({ ok: false, error: 'validation', errors }, { status: 400 })
  }
  const v = parsed.data

  try {
    await registerSchool({
      schoolName: v.schoolName,
      subdomain: v.subdomain,
      email: v.email,
      phone: v.phone,
      principalName: v.principalName,
      principalPasswordHash: await bcrypt.hash(v.password, 12),
    })
    return NextResponse.json({ ok: true, subdomain: v.subdomain })
  } catch (e) {
    if (e?.code === '23505') {
      return NextResponse.json({ ok: false, error: 'taken', errors: { subdomain: 'This address is already taken' } }, { status: 409 })
    }
    if (e?.code === '22023') {
      return NextResponse.json({ ok: false, error: 'invalid_subdomain', errors: { subdomain: 'Choose a different address' } }, { status: 400 })
    }
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }
}
