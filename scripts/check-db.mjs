// Backend health check: npm run check:db
// Reads .env.local (or the real environment), then verifies Supabase is reachable,
// the schema matches what the code queries, the demo school exists, and the
// NextAuth login query path works. Read-only; writes nothing.
import { readFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const envPath = new URL('../.env.local', import.meta.url)
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const REQUIRED = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXTAUTH_SECRET']

// Columns the app code selects/inserts/filters on, per table (from lib/**, middleware, layouts).
const EXPECTED = {
  schools: 'id,school_name,subdomain,email,phone,city,address,plan,trial_ends,status,created_at',
  users: 'id,school_id,name,email,password_hash,role,status,is_first_login',
  school_settings: 'id,school_id,academic_year,principal_name',
  classes: 'id,school_id,name,section,academic_year',
  subjects: 'id,school_id,name,code',
  teacher_assignments: 'id,school_id,teacher_id,class_id,subject_id',
  students: 'id,school_id,class_id,gr_number,roll_number,name,father_name,mother_name,guardian_name,guardian_relationship,date_of_birth,place_of_birth,gender,religion,caste,nationality,b_form_number,father_cnic,mother_cnic,contact,home_address,emergency_contact,last_school_name,last_school_tc_number,last_school_leaving_date,last_class_attended,date_of_admission,admitted_in_class,date_of_leaving,leaving_reason,leaving_class,promoted_to_class,status',
  results: 'id,school_id,class_id,subject_id,exam_type,status',
}

let failed = false
const ok = (m) => console.log(`  ok    ${m}`)
const bad = (kind, m) => { failed = true; console.log(`  FAIL  [${kind}] ${m}`) }

function classify(err) {
  const msg = `${err?.message || ''} ${err?.cause?.code || ''} ${err?.code || ''} ${err?.details || ''}`
  if (/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ETIMEDOUT|ECONNRESET|fetch failed|network|UND_ERR/i.test(msg)) return 'network blocked or project paused (host unreachable)'
  if (/PGRST205|PGRST204|42P01|42703|does not exist|schema cache/i.test(msg)) return 'schema mismatch'
  if (/paused|540|upstream|<html/i.test(msg)) return 'project paused'
  if (/Invalid API key|JWT|401|403/i.test(msg)) return 'wrong keys (env vars)'
  return 'unknown'
}

console.log('1. Environment')
const missing = REQUIRED.filter((k) => !process.env[k])
if (missing.length) {
  bad('missing env vars', `${missing.join(', ')} not set (no .env.local? cloud session?)`)
  process.exit(1)
}
ok('required env vars present')
console.log(process.env.NEXTAUTH_URL ? '  ok    NEXTAUTH_URL set' : '  note  NEXTAUTH_URL not set (fine locally/Vercel, required elsewhere in production)')

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

console.log('2. Connectivity + schools read')
const probe = await db.from('schools').select('id', { count: 'exact', head: true }).then((r) => r, (e) => ({ error: e }))
if (probe.error) {
  let kind = classify(probe.error)
  if (kind.startsWith('network')) {
    // Tell "our host is gone" apart from "no internet": resolve the project host, then a control host.
    const { lookup } = await import('node:dns/promises')
    const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
    const hostOk = await lookup(host).then(() => true, () => false)
    const netOk = await lookup('example.com').then(() => true, () => false)
    if (!hostOk && netOk) kind = 'project paused/deleted or wrong NEXT_PUBLIC_SUPABASE_URL (host does not resolve, internet is fine)'
    else if (!netOk) kind = 'network blocked (no DNS at all)'
  }
  bad(kind, probe.error.message || String(probe.error))
  console.log('\nIf this says paused: restore the project in the Supabase dashboard, wait ~2 min, rerun.')
  process.exit(1)
}
ok(`schools readable (${probe.count} rows)`)

console.log('3. Schema vs code')
for (const [table, cols] of Object.entries(EXPECTED)) {
  const { error } = await db.from(table).select(cols).limit(1)
  if (error) bad(classify(error), `${table}: ${error.message}`)
  else ok(`${table}: all ${cols.split(',').length} referenced columns exist`)
}

console.log('4. Demo school + NextAuth login path')
const { data: school, error: sErr } = await db.from('schools').select('*').eq('subdomain', 'ghs').eq('status', 'active').single()
if (sErr || !school) bad('seed missing', `school 'ghs' not found/active: ${sErr?.message || 'no row'} (run supabase/seed.sql)`)
else {
  ok(`school 'ghs' exists: ${school.school_name}`)
  const { data: user, error: uErr } = await db.from('users').select('*').eq('email', 'principal@ghs.com').eq('school_id', school.id).eq('status', 'active').single()
  if (uErr || !user) bad('seed missing', `user principal@ghs.com not found: ${uErr?.message || 'no row'}`)
  else if (!(await bcrypt.compare('password', user.password_hash))) bad('seed mismatch', 'demo password hash does not verify "password"')
  else ok('authorize() path works: school -> user -> bcrypt verify')
}

console.log(failed ? '\nRESULT: FAILED' : '\nRESULT: all checks passed')
process.exit(failed ? 1 : 0)
