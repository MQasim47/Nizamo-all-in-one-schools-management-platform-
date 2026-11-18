import { api, ok } from '@/lib/api/handler'
import { requireAuth, requirePermission } from '@/lib/api/auth'
import { parseBody } from '@/lib/api/parse.mjs'
import { getSchoolClient } from '@/lib/supabase/school'
import { settingsPatchSchema } from '@/lib/validation/settings.mjs'
import { getSettings, updateSettings } from '@/lib/services/settings'

// /api/v1/settings — reference example of an AUTHENTICATED /api/v1 route:
// auth -> permission -> parse -> service -> respond. No logic here.

// GET  200 { academicYear, hijriOffset }   401 signed out   403 no settings.read
export const GET = api(async (request) => {
  const auth = requirePermission(await requireAuth(request), 'settings.read')
  return ok(await getSettings(await getSchoolClient(auth)))
})

// PATCH { hijri_offset }   200 updated settings   400 bad JSON   401   403 no settings.write
//       422 { error: { code: 'validation_failed', fields } }   404 no settings row
export const PATCH = api(async (request) => {
  const auth = requirePermission(await requireAuth(request), 'settings.write')
  const input = await parseBody(request, settingsPatchSchema)
  return ok(await updateSettings(await getSchoolClient(auth), input))
})
