import 'server-only'
import { createClient } from '@supabase/supabase-js'

// SERVICE-ROLE client: bypasses RLS entirely.
// Allowed only inside lib/db/admin/* (superadmin operations, login, registration) and scripts/.
// School-scoped code must use getSchoolClient(session) from lib/supabase/school.js instead.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
