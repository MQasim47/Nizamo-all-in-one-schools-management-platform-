import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { detectSchoolBySubdomain } from '@/lib/db/admin/schools'

// Used only by proxy.js to turn unknown subdomains into a 404. Guarded by a header carrying
// NEXTAUTH_SECRET so it can't be probed from outside (and isn't subject to the public limiter).
export async function GET(request) {
  const given = Buffer.from(request.headers.get('x-nz-internal') || '')
  const want = Buffer.from(process.env.NEXTAUTH_SECRET || '')
  if (!want.length || given.length !== want.length || !timingSafeEqual(given, want)) {
    return new NextResponse(null, { status: 404 })
  }
  const sub = new URL(request.url).searchParams.get('subdomain') || ''
  const school = await detectSchoolBySubdomain(sub)
  return NextResponse.json({ exists: !!school })
}
