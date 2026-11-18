import 'server-only'
import { accessState, resolveSession } from '@/lib/auth/session'
import { can } from '@/lib/auth/permissions.mjs'
import { forbidden, unauthenticated } from './errors.mjs'

// Who is calling an /api/v1 route.
//
// Web: the NextAuth session cookie (same re-check as pages: user active, school not suspended,
// CURRENT role from the database).
//
// Mobile (designed now, switched on in Session 8): `Authorization: Bearer <access token>`.
//   - access token: short-lived (15 min) JWT signed by us, claims { sub: userId, sid: deviceSessionId,
//     school_id }, audience "nizamo-mobile";
//   - refresh token: random, stored HASHED in `device_sessions` (user_id, school_id, device_id,
//     platform, created_at, last_seen_at, revoked_at), rotated on every use, so a school can sign a
//     lost phone out by revoking the row;
//   - verifyBearerToken() checks signature + expiry + that the device session is not revoked, then
//     the same accessState() re-check as the cookie path. The result has the same shape as a web
//     session, so getSchoolClient(auth) and RLS work unchanged.
// Until then every bearer token is refused with 401 (never silently treated as anonymous).

async function verifyBearerToken(/* token */) {
  throw unauthenticated('Signing in with a token is not available yet.')
}

/**
 * Returns the caller as a session-shaped object `{ user: { id, schoolId, role, ... }, via }`.
 * Throws 401 when signed out, deactivated, suspended or the token is invalid.
 */
export async function requireAuth(request) {
  const header = request?.headers?.get('authorization') || ''
  if (/^bearer\s+/i.test(header)) {
    const claims = await verifyBearerToken(header.replace(/^bearer\s+/i, '').trim())
    const state = await accessState(claims.userId, claims.schoolId)
    if (!state.active) throw unauthenticated()
    return { user: { id: claims.userId, schoolId: claims.schoolId, role: state.role }, via: 'bearer' }
  }

  const { session } = await resolveSession()
  if (!session) throw unauthenticated()
  return { ...session, via: 'cookie' }
}

/** Throws 403 unless the caller's current role has `permission` (lib/auth/permissions.mjs). */
export function requirePermission(auth, permission) {
  if (!can(auth?.user?.role, permission)) throw forbidden()
  return auth
}

/** Super admin only (platform routes under /api/v1/admin). */
export function requireSuperadmin(auth) {
  if (auth?.user?.role !== 'superadmin') throw forbidden()
  return auth
}
