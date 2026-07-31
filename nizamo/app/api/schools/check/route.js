import { NextResponse } from 'next/server'
import { detectSchoolBySubdomain } from '@/lib/db/schools'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const subdomain = searchParams.get('subdomain')

  if (!subdomain) {
    return NextResponse.json({ found: false }, { status: 400 })
  }

  const school = await detectSchoolBySubdomain(subdomain)

  if (!school) {
    return NextResponse.json({ found: false })
  }

  return NextResponse.json({
    found: true,
    school: {
      school_name: school.school_name,
      subdomain: school.subdomain,
      plan: school.plan,
    },
  })
}
