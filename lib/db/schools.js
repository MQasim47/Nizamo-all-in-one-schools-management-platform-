import { supabaseAdmin } from '../supabase'

// ============================================
// SCHOOL DETECTION (replaces PHP detect_school())
// ============================================

export async function detectSchoolBySubdomain(subdomain) {
  if (!subdomain || subdomain === 'www' || subdomain === 'localhost') {
    return null
  }

  const { data, error } = await supabaseAdmin
    .from('schools')
    .select('*')
    .eq('subdomain', subdomain)
    .eq('status', 'active')
    .single()

  if (error || !data) return null
  return data
}

export async function getSchoolById(schoolId) {
  const { data, error } = await supabaseAdmin
    .from('schools')
    .select('*')
    .eq('id', schoolId)
    .single()

  if (error) return null
  return data
}

export async function checkSubdomainAvailable(subdomain) {
  const { data } = await supabaseAdmin
    .from('schools')
    .select('id')
    .eq('subdomain', subdomain)
    .single()

  return !data // true = available
}

export async function registerSchool({
  schoolName,
  subdomain,
  email,
  phone,
  city,
  address,
  plan,
  principalName,
  principalPasswordHash,
}) {
  // 1. Create the school
  const trialEnds = new Date()
  trialEnds.setDate(trialEnds.getDate() + 30)

  const { data: school, error: schoolError } = await supabaseAdmin
    .from('schools')
    .insert({
      school_name: schoolName,
      subdomain,
      email,
      phone,
      city,
      address,
      plan: plan || 'trial',
      trial_ends: trialEnds.toISOString().split('T')[0],
      status: 'active',
    })
    .select()
    .single()

  if (schoolError) throw schoolError

  // 2. Create the principal account
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .insert({
      school_id: school.id,
      name: principalName,
      email,
      password_hash: principalPasswordHash,
      role: 'principal',
      is_first_login: true,
    })
    .select()
    .single()

  if (userError) throw userError

  // 3. Create default school_settings row
  await supabaseAdmin.from('school_settings').insert({
    school_id: school.id,
    academic_year: '2025-2026',
  })

  return { school, user }
}

export async function getAllSchools() {
  const { data, error } = await supabaseAdmin
    .from('schools')
    .select('*')
    .neq('subdomain', 'admin')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function updateSchoolStatus(schoolId, status) {
  const { error } = await supabaseAdmin
    .from('schools')
    .update({ status })
    .eq('id', schoolId)

  if (error) throw error
}

export async function updateSchoolPlan(schoolId, plan) {
  const { error } = await supabaseAdmin
    .from('schools')
    .update({ plan })
    .eq('id', schoolId)

  if (error) throw error
}

export async function getSchoolSettings(schoolId) {
  const { data, error } = await supabaseAdmin
    .from('school_settings')
    .select('*')
    .eq('school_id', schoolId)
    .single()

  if (error) {
    // Create default if not exists
    const { data: newSettings } = await supabaseAdmin
      .from('school_settings')
      .insert({ school_id: schoolId, academic_year: '2025-2026' })
      .select()
      .single()
    return newSettings
  }

  return data
}

export async function updateSchoolSettings(schoolId, settings) {
  const { error } = await supabaseAdmin
    .from('school_settings')
    .update(settings)
    .eq('school_id', schoolId)

  if (error) throw error
}
