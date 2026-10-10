import 'server-only'
import { z } from 'zod'
import { supabaseAdmin } from './client'
import { subdomainSchema } from '@/lib/validation/auth'

// Cross-school operations. Everything that spans tenants lives here, behind assertSuperadmin().

export class ForbiddenError extends Error {
  constructor() {
    super('Forbidden')
    this.name = 'ForbiddenError'
  }
}

// Verifies against the DATABASE (not just the session) that the caller is an active superadmin.
export async function assertSuperadmin(session) {
  const id = session?.user?.id
  if (!id) throw new ForbiddenError()
  const { data } = await supabaseAdmin
    .from('users')
    .select('role, status, schools:school_id ( status )')
    .eq('id', id)
    .maybeSingle()
  if (!data || data.role !== 'superadmin' || data.status !== 'active' || data.schools?.status !== 'active') {
    throw new ForbiddenError()
  }
}

const uuid = z.string().uuid()
const statusSchema = z.enum(['active', 'inactive', 'suspended'])
const planSchema = z.enum(['trial', 'basic', 'standard', 'pro'])

// ---- public lookups (no session; used by login and the school check endpoint) ----

export async function detectSchoolBySubdomain(subdomain) {
  const parsed = subdomainSchema.safeParse(subdomain)
  if (!parsed.success) return null
  const { data } = await supabaseAdmin
    .from('schools')
    .select('id, school_name, subdomain, plan')
    .eq('subdomain', parsed.data)
    .eq('status', 'active')
    .maybeSingle()
  return data
}

export async function checkSubdomainAvailable(subdomain) {
  const parsed = subdomainSchema.safeParse(subdomain)
  if (!parsed.success) return false
  const { data } = await supabaseAdmin
    .from('schools')
    .select('id')
    .eq('subdomain', parsed.data)
    .maybeSingle()
  return !data
}

// ---- registration: one database transaction (register_school), no orphan rows ----

const registerSchema = z.object({
  schoolName: z.string().trim().min(2).max(120),
  subdomain: subdomainSchema,
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z.string().trim().max(30).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  address: z.string().trim().max(300).optional().nullable(),
  plan: planSchema.optional(),
  principalName: z.string().trim().min(2).max(120),
  principalPasswordHash: z.string().min(20).max(100),
})

export async function registerSchool(input) {
  const v = registerSchema.parse(input)
  const { data, error } = await supabaseAdmin.rpc('register_school', {
    p_school_name: v.schoolName,
    p_subdomain: v.subdomain,
    p_email: v.email,
    p_phone: v.phone ?? null,
    p_city: v.city ?? null,
    p_address: v.address ?? null,
    p_plan: v.plan ?? 'trial',
    p_principal_name: v.principalName,
    p_password_hash: v.principalPasswordHash,
  })
  if (error) throw error
  return data // new school id
}

// ---- superadmin only ----

export async function getAllSchools(session) {
  await assertSuperadmin(session)
  const { data, error } = await supabaseAdmin
    .from('schools')
    .select('id, school_name, subdomain, email, city, plan, status, trial_ends, created_at')
    .neq('subdomain', 'admin')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function updateSchoolStatus(session, schoolId, status) {
  await assertSuperadmin(session)
  const { error } = await supabaseAdmin
    .from('schools')
    .update({ status: statusSchema.parse(status) })
    .eq('id', uuid.parse(schoolId))
  if (error) throw error
}

export async function updateSchoolPlan(session, schoolId, plan) {
  await assertSuperadmin(session)
  const { error } = await supabaseAdmin
    .from('schools')
    .update({ plan: planSchema.parse(plan) })
    .eq('id', uuid.parse(schoolId))
  if (error) throw error
}
