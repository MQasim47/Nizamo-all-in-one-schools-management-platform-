import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkSubdomainAvailable } from '@/lib/db/admin/schools'
import { RESERVED_SUBDOMAINS, subdomainSchema } from '@/lib/validation/auth'
import { clientIp, isRateLimited } from '@/lib/utils/rate-limit'

// Live availability check for the register form. Answers only yes/no plus a reason code.
export async function GET(request) {
  if (isRateLimited(`avail:${clientIp(request)}`, { limit: 60, windowMs: 60 * 1000 })) {
    return NextResponse.json({ available: false, reason: 'rate_limited' }, { status: 429 })
  }
  const parsed = z.object({ subdomain: subdomainSchema }).safeParse({
    subdomain: new URL(request.url).searchParams.get('subdomain'),
  })
  if (!parsed.success) return NextResponse.json({ available: false, reason: 'invalid' })
  if (RESERVED_SUBDOMAINS.includes(parsed.data.subdomain)) {
    return NextResponse.json({ available: false, reason: 'reserved' })
  }
  const available = await checkSubdomainAvailable(parsed.data.subdomain)
  return NextResponse.json({ available, reason: available ? null : 'taken' })
}
