import 'server-only'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth/options'
import { getUserAccessState } from '@/lib/db/admin/auth'
import { can } from '@/lib/auth/permissions.mjs'

// Re-check, on every server request, that the user is still active and the school is not
// suspended (C5). Cached per server instance for 60s so it is not a DB hit per component.
const TTL_MS = 60 * 1000
const cache = new Map()

export async function accessState(userId, schoolId) {
  const key = `${userId}:${schoolId}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < TTL_MS) return hit.state
  const state = await getUserAccessState(userId, schoolId)
  cache.set(key, { at: Date.now(), state })
  if (cache.size > 5000) cache.clear()
  return state
}

// Returns the session with the CURRENT role from the database, or null when not allowed in.
// Cookie (web) sessions only; /api/v1 routes use requireAuth() in lib/api/auth.js, which adds the
// bearer-token path for the mobile app.
export async function resolveSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return { session: null, reason: 'none' }
  const state = await accessState(session.user.id, session.user.schoolId)
  if (!state.active) return { session: null, reason: 'inactive' }
  return { session: { ...session, user: { ...session.user, role: state.role } }, reason: null }
}

// For pages and layouts. Redirects when signed out, deactivated or suspended, or when the
// role lacks `permission`.
export async function requireSession({ permission } = {}) {
  const { session, reason } = await resolveSession()
  if (!session) redirect(reason === 'inactive' ? '/signed-out?reason=inactive' : '/login')
  if (permission && !can(session.user.role, permission)) redirect('/school/dashboard')
  return session
}

// Older route handlers: returns { session } or { error: Response } (standard error envelope).
// New /api/v1 routes use requireAuth + requirePermission from lib/api/auth.js instead.
export async function requireApiSession(permission) {
  const { session } = await resolveSession()
  if (!session) return { error: NextResponse.json({ error: { code: 'unauthenticated', message: 'Please sign in again.' } }, { status: 401 }) }
  if (permission && !can(session.user.role, permission)) {
    return { error: NextResponse.json({ error: { code: 'forbidden', message: 'You do not have permission to do this.' } }, { status: 403 }) }
  }
  return { session }
}
