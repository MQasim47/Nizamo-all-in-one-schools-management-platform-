import 'server-only'
import { createHash } from 'node:crypto'
import { supabaseAdmin } from './client'

// Login support. Runs before any session exists, so it must use the admin client.

export const MAX_FAILURES = 5
export const LOCK_MINUTES = 15

// identifier = sha256(subdomain|email): the raw email is never stored in login_attempts.
export function loginIdentifier(subdomain, email) {
  return createHash('sha256').update(`${subdomain}|${email}`).digest('hex')
}

// Locked when the last 5 attempts were all failures and the newest is under 15 minutes old.
export async function isLoginLocked(identifier) {
  const { data } = await supabaseAdmin
    .from('login_attempts')
    .select('success, created_at')
    .eq('identifier', identifier)
    .order('created_at', { ascending: false })
    .limit(MAX_FAILURES)

  if (!data || data.length < MAX_FAILURES) return false
  if (data.some((a) => a.success)) return false
  const newest = new Date(data[0].created_at).getTime()
  return Date.now() - newest < LOCK_MINUTES * 60 * 1000
}

export async function recordLoginAttempt(identifier, success) {
  await supabaseAdmin.from('login_attempts').insert({ identifier, success })
}

export async function findActiveSchool(subdomain) {
  const { data } = await supabaseAdmin
    .from('schools')
    .select('id, school_name, subdomain, plan')
    .eq('subdomain', subdomain)
    .eq('status', 'active')
    .maybeSingle()
  return data
}

export async function findActiveUser(schoolId, email) {
  const { data } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role, password_hash, is_first_login')
    .eq('school_id', schoolId)
    .eq('email', email)
    .eq('status', 'active')
    .maybeSingle()
  return data
}

// Used on every request (cached) to confirm a signed-in user is still allowed in.
export async function getUserAccessState(userId, schoolId) {
  const { data } = await supabaseAdmin
    .from('users')
    .select('role, status, schools:school_id ( status )')
    .eq('id', userId)
    .eq('school_id', schoolId)
    .maybeSingle()
  if (!data) return { active: false }
  return {
    active: data.status === 'active' && data.schools?.status === 'active',
    role: data.role,
  }
}
