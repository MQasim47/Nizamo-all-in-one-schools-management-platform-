import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireApiSession } from '@/lib/auth/session'
import { getSchoolClient } from '@/lib/supabase/school'
import { updateSchoolSettings } from '@/lib/db/schools'

// Whitelisted school settings that the settings page may change. Never passes the payload through:
// only these keys, validated, and the school always comes from the session.
const bodySchema = z.object({ hijri_offset: z.number().int().min(-2).max(2) }).strict()

export async function PATCH(request) {
  const { session, error } = await requireApiSession('settings.write')
  if (error) return error

  let body
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Please choose a number from -2 to +2.' }, { status: 400 })
  }

  try {
    const ctx = await getSchoolClient(session)
    await updateSchoolSettings(ctx, { hijri_offset: body.hijri_offset })
    return NextResponse.json({ ok: true })
  } catch {
    // Most likely migration 004 has not been run yet (column missing). Details stay out of the response.
    return NextResponse.json({ error: 'Could not save. Please try again.' }, { status: 500 })
  }
}
