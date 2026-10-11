import { NextResponse } from 'next/server'
import { waitlistSchema } from '@/lib/validation/waitlist'
import { addWaitlistEntry } from '@/lib/db/admin/waitlist'
import { clientIp, isRateLimited } from '@/lib/utils/rate-limit'

// Public endpoint. Defences: JSON only, size cap, rate limit (5/hour/IP), honeypot, zod,
// duplicate WhatsApp check. Never logs personal data.
export async function POST(request) {
  if (isRateLimited(`waitlist:${clientIp(request)}`, { limit: 5, windowMs: 60 * 60 * 1000 })) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }

  if (!request.headers.get('content-type')?.includes('application/json')) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 415 })
  }
  if (Number(request.headers.get('content-length') || 0) > 4000) {
    return NextResponse.json({ ok: false, error: 'too_large' }, { status: 413 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  // Honeypot: pretend it worked so bots learn nothing.
  if (body && typeof body.website === 'string' && body.website.trim() !== '') {
    return NextResponse.json({ ok: true })
  }

  const parsed = waitlistSchema.safeParse(body)
  if (!parsed.success) {
    const errors = {}
    for (const issue of parsed.error.issues) errors[issue.path[0] ?? 'form'] ??= issue.message
    return NextResponse.json({ ok: false, error: 'validation', errors }, { status: 400 })
  }

  try {
    const { duplicate } = await addWaitlistEntry(parsed.data)
    return NextResponse.json({ ok: true, duplicate })
  } catch {
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }
}
