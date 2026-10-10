import { SignJWT } from 'jose'

// Signs the short-lived Supabase JWT that PostgREST turns into RLS context.
// PostgREST uses the `role` claim as the Postgres role, so it must be 'authenticated';
// the application role travels separately in `app_role`.
// Pure module (no 'server-only') so scripts/ can reuse it. App code goes through lib/supabase/school.js.
export async function signSupabaseToken({ userId, schoolId, appRole, secret, ttlSeconds = 600 }) {
  if (!secret) throw new Error('SUPABASE_JWT_SECRET is not set')
  const now = Math.floor(Date.now() / 1000)
  return new SignJWT({ role: 'authenticated', school_id: schoolId, app_role: appRole })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId)
    .setAudience('authenticated')
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .sign(new TextEncoder().encode(secret))
}
