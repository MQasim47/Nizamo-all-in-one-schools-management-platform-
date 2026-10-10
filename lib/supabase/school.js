import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { signSupabaseToken } from '@/lib/auth/token-core.mjs'

// The ONLY way school-scoped code reaches the database.
// Returns a Supabase client that carries a short-lived JWT for this user, so Postgres
// row-level security enforces school_id and role limits. schoolId/userId/role come from the
// session, never from request input.
export async function getSchoolClient(session) {
  const u = session?.user
  if (!u?.id || !u?.schoolId) throw new Error('Not signed in')

  const token = await signSupabaseToken({
    userId: u.id,
    schoolId: u.schoolId,
    appRole: u.role,
    secret: process.env.SUPABASE_JWT_SECRET,
  })

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  )

  return { db, schoolId: u.schoolId, userId: u.id, role: u.role }
}
