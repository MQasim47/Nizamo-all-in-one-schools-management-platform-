import { z } from 'zod'
import { currentAcademicYear } from '@/lib/utils/format'

// School-scoped settings. Cross-school operations (list/suspend/plan) live in lib/db/admin/schools.js.

const settingsSchema = z
  .object({
    academic_year: z.string().regex(/^\d{4}-\d{4}$/).optional(),
    principal_name: z.string().trim().max(120).nullable().optional(),
    school_address: z.string().trim().max(300).nullable().optional(),
    school_phone: z.string().trim().max(30).nullable().optional(),
    school_email: z.string().trim().email().max(254).nullable().optional(),
    logo_url: z.string().trim().max(500).nullable().optional(),
    marksheet_footer: z.string().trim().max(500).nullable().optional(),
    passing_percentage: z.number().min(0).max(100).optional(),
  })
  .strict()

export async function getSchoolSettings(ctx) {
  const { data, error } = await ctx.db.from('school_settings').select('*').maybeSingle()
  if (error) throw error
  if (data) return data

  // No row yet: create the default (only a genuine "no rows", not any error).
  const { data: created, error: insErr } = await ctx.db
    .from('school_settings')
    .insert({ school_id: ctx.schoolId, academic_year: currentAcademicYear() })
    .select()
    .single()
  if (insErr) throw insErr
  return created
}

export async function updateSchoolSettings(ctx, settings) {
  const values = settingsSchema.parse(settings)
  const { error } = await ctx.db.from('school_settings').update(values).eq('school_id', ctx.schoolId)
  if (error) throw error
}
