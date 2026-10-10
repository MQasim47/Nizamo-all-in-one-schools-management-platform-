// Tenant isolation test. Run: npm run test:tenant   (needs migration 002 applied)
// Seeds two throwaway schools with the admin client, then talks to the database ONLY through
// per-user tokens (the same path getSchoolClient() uses) and proves school A never sees or
// touches school B. Cleans up after itself (audit_log rows are append-only and stay).
import { readFileSync, existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { signSupabaseToken } from '../lib/auth/token-core.mjs'
import { ROLE_PERMISSIONS } from '../lib/auth/permissions.mjs'

const envUrl = new URL('../.env.local', import.meta.url)
if (existsSync(envUrl)) {
  for (const line of readFileSync(envUrl, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const { NEXT_PUBLIC_SUPABASE_URL: URL_, NEXT_PUBLIC_SUPABASE_ANON_KEY: ANON, SUPABASE_SERVICE_ROLE_KEY: SERVICE, SUPABASE_JWT_SECRET: JWT } = process.env
for (const [k, v] of Object.entries({ URL_, ANON, SERVICE, JWT })) if (!v) { console.error(`missing env: ${k}`); process.exit(1) }

const admin = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } })
const asUser = async (u, secret = JWT) => {
  const token = await signSupabaseToken({ userId: u.id, schoolId: u.school_id, appRole: u.role, secret })
  return createClient(URL_, ANON, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } })
}

let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + extra}`) }
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data }
const denied = (r) => !!r.error || (Array.isArray(r.data) && r.data.length === 0)

const tag = randomBytes(3).toString('hex')
const schools = []

async function seedSchool(label) {
  const s = must(await admin.from('schools').insert({ school_name: `TT ${label} ${tag}`, subdomain: `tt${label}${tag}`, email: `${label}@tt.test` }).select().single(), 'school')
  schools.push(s.id)
  const mkUser = async (role, n) => must(await admin.from('users').insert({ school_id: s.id, name: `${role}-${n}`, email: `${role}${n}-${label}${tag}@tt.test`, password_hash: 'x', role }).select('id, school_id, role').single(), 'user')
  const principal = await mkUser('principal', 1)
  const teacher = await mkUser('teacher', 1)
  const teacher2 = await mkUser('teacher', 2)
  const parent = await mkUser('parent', 1)
  const klass = must(await admin.from('classes').insert([{ school_id: s.id, name: '9', section: 'A' }, { school_id: s.id, name: '9', section: 'B' }]).select(), 'classes')
  const subject = must(await admin.from('subjects').insert({ school_id: s.id, name: 'Math' }).select().single(), 'subject')
  const students = must(await admin.from('students').insert([
    { school_id: s.id, class_id: klass[0].id, roll_number: '1', name: `${label}-kid1` },
    { school_id: s.id, class_id: klass[1].id, roll_number: '2', name: `${label}-kid2` },
  ]).select(), 'students')
  must(await admin.from('school_settings').insert({ school_id: s.id }), 'settings')
  must(await admin.from('teacher_assignments').insert({ school_id: s.id, teacher_id: teacher.id, class_id: klass[0].id, subject_id: subject.id }), 'assignment')
  must(await admin.from('user_students').insert({ school_id: s.id, user_id: parent.id, student_id: students[0].id }), 'link')
  must(await admin.from('attendance').insert({ school_id: s.id, student_id: students[0].id, class_id: klass[0].id, subject_id: subject.id, date: '2026-01-05', status: 'present' }), 'attendance')
  must(await admin.from('results').insert([
    { school_id: s.id, student_id: students[0].id, class_id: klass[0].id, subject_id: subject.id, exam_type: 'final', status: 'approved', marks_obtained: 80, entered_by: teacher.id },
    { school_id: s.id, student_id: students[1].id, class_id: klass[1].id, subject_id: subject.id, exam_type: 'final', status: 'pending', marks_obtained: 70 },
  ]), 'results')
  must(await admin.from('homework').insert({ school_id: s.id, class_id: klass[0].id, subject_id: subject.id, teacher_id: teacher.id, title: 'hw' }), 'homework')
  const ft = must(await admin.from('fee_types').insert({ school_id: s.id, name: 'Tuition' }).select().single(), 'fee_type')
  must(await admin.from('fee_structures').insert({ school_id: s.id, class_id: klass[0].id, fee_type_id: ft.id, amount: 1000 }), 'fee_structure')
  must(await admin.from('fee_payments').insert({ school_id: s.id, student_id: students[0].id, fee_type_id: ft.id, amount_paid: 500 }), 'fee_payment')
  return { school: s, principal, teacher, teacher2, parent, klass, subject, students, ft }
}

const USER_COLS = 'id, school_id, name, email, role, phone, status, is_first_login, created_at'
const TABLES = ['schools', 'users', 'school_settings', 'classes', 'subjects', 'teacher_assignments', 'students',
  'user_students', 'attendance', 'results', 'homework', 'fee_types', 'fee_structures', 'fee_payments', 'audit_log']
const scopeCol = (t) => (t === 'schools' ? 'id' : 'school_id')
const cols = (t) => (t === 'users' ? USER_COLS : '*')

try {
  const A = await seedSchool('a')
  const B = await seedSchool('b')
  console.log(`seeded two schools (tag ${tag})\n`)

  console.log('1. Every table: school A principal sees zero rows of school B (and vice versa)')
  const pa = await asUser(A.principal), pb = await asUser(B.principal)
  for (const t of TABLES) {
    const { count: bRows } = await admin.from(t).select('*', { count: 'exact', head: true }).eq(scopeCol(t), B.school.id)
    const { count: aRows } = await admin.from(t).select('*', { count: 'exact', head: true }).eq(scopeCol(t), A.school.id)
    const ra = await pa.from(t).select(cols(t))
    const rb = await pb.from(t).select(cols(t))
    const aSeesB = (ra.data || []).filter((r) => r[scopeCol(t)] === B.school.id).length
    const bSeesA = (rb.data || []).filter((r) => r[scopeCol(t)] === A.school.id).length
    const aOwn = (ra.data || []).filter((r) => r[scopeCol(t)] === A.school.id).length
    const stray = (ra.data || []).length - aOwn
    check(`${t}: A sees 0 of B's ${bRows} rows, only its own (${aOwn}/${aRows}), B sees 0 of A`,
      !ra.error && !rb.error && aSeesB === 0 && bSeesA === 0 && stray === 0 && bRows > 0 && aOwn > 0,
      `err=${ra.error?.message || rb.error?.message} aSeesB=${aSeesB} bSeesA=${bSeesA} stray=${stray} bRows=${bRows} aOwn=${aOwn}`)
  }

  console.log('\n2. Cross-school writes are rejected')
  const k = B.klass[0].id
  check('A cannot insert a student into school B', !!(await pa.from('students').insert({ school_id: B.school.id, class_id: k, roll_number: '9', name: 'x' })).error)
  check("A cannot attach its student to B's class", !!(await pa.from('students').insert({ school_id: A.school.id, class_id: k, roll_number: '9', name: 'x' })).error)
  check('A cannot move a student to school B', !!(await pa.from('students').update({ school_id: B.school.id }).eq('id', A.students[0].id)).error)
  check("A cannot modify B's student (0 rows)", denied(await pa.from('students').update({ name: 'pwned' }).eq('id', B.students[0].id).select()))
  check("A cannot delete B's class (0 rows)", denied(await pa.from('classes').delete().eq('id', k).select()))
  check("A cannot approve B's results (0 rows)", denied(await pa.from('results').update({ status: 'approved' }).eq('school_id', B.school.id).select()))
  check("A cannot read B's fee payments by id", denied(await pa.from('fee_payments').select('*').eq('school_id', B.school.id)))
  const stillB = must(await admin.from('students').select('name').eq('id', B.students[0].id).single(), 'recheck')
  check("B's student untouched after the attacks", stillB.name === 'b-kid1')

  console.log('\n3. Roles inside one school')
  const t1 = await asUser(A.teacher), t2 = await asUser(A.teacher2), par = await asUser(A.parent)
  const names = async (c) => (must(await c.from('students').select('name'), 'students')).map((s) => s.name).sort().join(',')
  check('teacher sees only the assigned class (a-kid1)', (await names(t1)) === 'a-kid1')
  check('teacher with no assignment sees no students', (await names(t2)) === '')
  check('parent sees only the linked child (a-kid1)', (await names(par)) === 'a-kid1')
  check("parent sees only approved results of own child", (must(await par.from('results').select('status'), 'r')).every((r) => r.status === 'approved') && (await par.from('results').select('id')).data.length === 1)
  check('parent cannot read fee types/structures', denied(await par.from('fee_types').select('*')) && denied(await par.from('fee_structures').select('*')))
  check('parent can read fee payments of own child only', (must(await par.from('fee_payments').select('student_id'), 'fp')).every((r) => r.student_id === A.students[0].id))
  check('teacher cannot edit a student record (0 rows)', denied(await t1.from('students').update({ name: 'x' }).eq('id', A.students[0].id).select()))
  check('teacher cannot read fees', denied(await t1.from('fee_payments').select('*')))
  check('teacher cannot read the audit log', denied(await t1.from('audit_log').select('*')))
  const sneaky = await t1.from('results').update({ status: 'approved' }).eq('student_id', A.students[0].id).select()
  check('teacher cannot approve marks', denied(sneaky))
  const own = await t1.from('results').insert({ school_id: A.school.id, student_id: A.students[0].id, class_id: A.klass[0].id, subject_id: A.subject.id, exam_type: 'midterm', status: 'pending', marks_obtained: 50, entered_by: A.teacher.id })
  check('teacher can enter pending marks for their own class/subject', !own.error, own.error?.message)
  const outside = await t1.from('results').insert({ school_id: A.school.id, student_id: A.students[1].id, class_id: A.klass[1].id, subject_id: A.subject.id, exam_type: 'midterm', status: 'pending', marks_obtained: 50, entered_by: A.teacher.id })
  check('teacher cannot enter marks for an unassigned class', !!outside.error)
  const selfApprove = await t1.from('results').insert({ school_id: A.school.id, student_id: A.students[0].id, class_id: A.klass[0].id, subject_id: A.subject.id, exam_type: 'quarterly', status: 'approved', marks_obtained: 99, entered_by: A.teacher.id })
  check('teacher cannot insert an already-approved result', !!selfApprove.error)
  check('principal can approve (same school)', !(await pa.from('results').update({ status: 'approved', approved_by: A.principal.id }).eq('school_id', A.school.id).eq('status', 'pending').select()).error)
  check('principal cannot create a superadmin', !!(await pa.from('users').insert({ school_id: A.school.id, name: 'x', email: `x-${tag}@tt.test`, password_hash: 'x', role: 'superadmin' })).error)

  console.log('\n4. Secrets and hard deletes')
  check('password_hash is unreadable', !!(await pa.from('users').select('password_hash')).error)
  check('select * on users is refused (must list columns)', !!(await pa.from('users').select('*')).error)
  check('students cannot be hard-deleted through the API', !!(await pa.from('students').delete().eq('id', A.students[0].id)).error)
  const soft = await pa.from('students').update({ deleted_at: new Date().toISOString(), deleted_by: A.principal.id }).eq('id', A.students[1].id).select()
  check('soft delete works and is reversible', !soft.error && soft.data.length === 1 && !(await pa.from('students').update({ deleted_at: null, deleted_by: null }).eq('id', A.students[1].id)).error)

  console.log('\n5. GR numbers and audit')
  const g = must(await pa.from('students').insert([
    { school_id: A.school.id, class_id: A.klass[0].id, roll_number: '10', name: 'g1' },
    { school_id: A.school.id, class_id: A.klass[0].id, roll_number: '11', name: 'g2' },
  ]).select('gr_number').order('gr_number'), 'gr insert').map((r) => Number(r.gr_number))
  check('GR numbers auto-assigned, numeric and consecutive', g.length === 2 && g[1] === g[0] + 1 && g[0] >= 1001, JSON.stringify(g))
  const dup = await pa.from('students').insert({ school_id: A.school.id, class_id: A.klass[0].id, roll_number: '12', name: 'dup', gr_number: String(g[0]) })
  check('duplicate GR number in the same school is rejected', !!dup.error)
  await pa.from('students').update({ father_name: 'Audit Father' }).eq('id', A.students[0].id)
  const au = must(await pa.from('audit_log').select('user_id, app_role, table_name, action, old_data, new_data, created_at').eq('record_id', A.students[0].id).eq('action', 'UPDATE'), 'audit')
  check('audit log records who/what/when and old -> new', au.length >= 1 && au.some((r) => r.user_id === A.principal.id && r.new_data?.father_name === 'Audit Father' && r.created_at))
  check('audit log cannot be edited (even by the service role)', !!(await admin.from('audit_log').update({ action: 'DELETE' }).eq('record_id', A.students[0].id)).error && !!(await admin.from('audit_log').delete().eq('record_id', A.students[0].id)).error)
  check('audit log never stores password hashes', (must(await admin.from('audit_log').select('old_data, new_data').eq('table_name', 'users').eq('school_id', A.school.id), 'audit users')).every((r) => !JSON.stringify(r).includes('password_hash')))

  console.log('\n6. Tokens, suspension, anonymous access')
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } })
  check('no token (anon key only): no rows from students', denied(await anon.from('students').select('*')))
  const forged = await asUser(A.principal, 'not-the-real-secret-not-the-real-secret')
  const fr = await forged.from('students').select('*')
  check('forged token is rejected', !!fr.error || (fr.data || []).length === 0)
  await admin.from('schools').update({ status: 'suspended' }).eq('id', A.school.id)
  check('suspended school: its principal immediately sees nothing', denied(await pa.from('students').select('*')))
  await admin.from('schools').update({ status: 'active' }).eq('id', A.school.id)
  await admin.from('users').update({ status: 'inactive' }).eq('id', A.teacher.id)
  check('deactivated user: token stops working at once', denied(await t1.from('students').select('*')))
  await admin.from('users').update({ status: 'active' }).eq('id', A.teacher.id)
  const lockedRows = await admin.from('login_attempts').select('id').limit(1)
  check('login_attempts is not readable by school users', !!(await pa.from('login_attempts').select('*')).error && !lockedRows.error)
  check('role_permissions / school_counters are hidden from school users', !!(await pa.from('role_permissions').select('*')).error && !!(await pa.from('school_counters').select('*')).error)

  console.log('\n7. Registration function and permission map')
  const rs = await admin.rpc('register_school', { p_school_name: `TT reg ${tag}`, p_subdomain: `ttreg${tag}`, p_email: `Reg${tag}@tt.test`, p_phone: null, p_city: null, p_address: null, p_plan: 'trial', p_principal_name: 'P', p_password_hash: 'x'.repeat(30) })
  if (rs.data) schools.push(rs.data)
  check('register_school creates school + principal + settings in one go', !rs.error && !!rs.data, rs.error?.message)
  check('register_school rejects reserved subdomains', !!(await admin.rpc('register_school', { p_school_name: 'x', p_subdomain: 'admin', p_email: 'x@x.test', p_phone: null, p_city: null, p_address: null, p_plan: 'trial', p_principal_name: 'P', p_password_hash: 'x' })).error)
  check('school users cannot call register_school', !!(await pa.rpc('register_school', { p_school_name: 'x', p_subdomain: `zz${tag}`, p_email: 'x@x.test', p_phone: null, p_city: null, p_address: null, p_plan: 'trial', p_principal_name: 'P', p_password_hash: 'x' })).error)
  const dbPerms = must(await admin.from('role_permissions').select('role, permission'), 'perms')
  const fromDb = {}
  for (const r of dbPerms) (fromDb[r.role] ||= []).push(r.permission)
  const same = (a, b) => JSON.stringify([...(a || [])].sort()) === JSON.stringify([...(b || [])].sort())
  const roles = new Set([...Object.keys(fromDb), ...Object.keys(ROLE_PERMISSIONS)])
  const diff = [...roles].filter((r) => !same(fromDb[r], ROLE_PERMISSIONS[r]))
  check('lib/auth/permissions.mjs matches the role_permissions table', diff.length === 0, `differs: ${diff.join(', ')}`)
} catch (e) {
  fail++
  console.error('\nTEST SETUP ERROR:', e.message)
} finally {
  for (const id of schools) await admin.from('schools').delete().eq('id', id)
  console.log(`\ncleanup: removed ${schools.length} test schools`)
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
