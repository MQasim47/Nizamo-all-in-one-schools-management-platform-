import 'server-only'
import { unwrap } from '@/lib/api/db.mjs'
import { notFound } from '@/lib/api/errors.mjs'
import { parseWith } from '@/lib/api/parse.mjs'
import { settingsPatchSchema } from '@/lib/validation/settings.mjs'
import { DEFAULT_HIJRI_OFFSET } from '@/lib/utils/dates.mjs'

// School settings service (reference example of an AUTHENTICATED service; see docs/API-PATTERN.md).
// Every function takes the ctx from getSchoolClient(): RLS limits it to the caller's school and
// role, and school_id always comes from ctx, never from input. Changes are written to audit_log by
// the database trigger on school_settings.

const COLUMNS = 'academic_year, hijri_offset'

const toDto = (row) => ({
  academicYear: row?.academic_year ?? null,
  hijriOffset: row?.hijri_offset ?? DEFAULT_HIJRI_OFFSET,
})

/** GET: the caller's school settings. */
export async function getSettings(ctx) {
  const row = unwrap(await ctx.db.from('school_settings').select(COLUMNS).eq('school_id', ctx.schoolId).maybeSingle())
  return toDto(row)
}

/** PATCH: change whitelisted settings. Input is validated here too, so pages can call it directly. */
export async function updateSettings(ctx, input) {
  const values = parseWith(settingsPatchSchema, input)
  const rows = unwrap(
    await ctx.db.from('school_settings').update(values).eq('school_id', ctx.schoolId).select(COLUMNS)
  )
  // RLS hides rows the caller may not change, so "0 rows" means there is nothing of theirs to update.
  if (!rows?.length) throw notFound('School settings were not found.')
  return toDto(rows[0])
}
