import { NextResponse } from 'next/server'
import { z } from 'zod'
import { detectSchoolBySubdomain } from '@/lib/db/admin/schools'
import { subdomainSchema } from '@/lib/validation/auth'

const querySchema = z.object({ subdomain: subdomainSchema })

// Tiny per-instance limiter (30 requests / minute / IP) so the endpoint can't be used to
// enumerate schools quickly. A shared store (Redis/Upstash) replaces this when we scale out.
const hits = new Map()
function limited(ip) {
  const now = Date.now()
  const rec = hits.get(ip)
  if (!rec || now - rec.start > 60_000) {
    hits.set(ip, { start: now, n: 1 })
    if (hits.size > 5000) hits.clear()
    return false
  }
  rec.n += 1
  return rec.n > 30
}

export async function GET(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (limited(ip)) {
    return NextResponse.json({ found: false, error: 'Too many requests' }, { status: 429 })
  }

  const parsed = querySchema.safeParse({
    subdomain: new URL(request.url).searchParams.get('subdomain'),
  })
  if (!parsed.success) return NextResponse.json({ found: false }, { status: 400 })

  const school = await detectSchoolBySubdomain(parsed.data.subdomain)
  if (!school) return NextResponse.json({ found: false })

  // Only what the login screen needs: no plan, no ids.
  return NextResponse.json({ found: true, school: { school_name: school.school_name } })
}
