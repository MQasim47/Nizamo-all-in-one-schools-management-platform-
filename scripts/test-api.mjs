// API test for /api/v1/settings: the REFERENCE TEST for every /api/v1 module (copy this file,
// see docs/API-PATTERN.md). Runs against a running server and the dev database:
//   npm run dev -- -p 3101     then     npm run test:api
// Covers: 401 (signed out, bearer token), 403 per role, 400/415 malformed, 422 validation with
// fields, happy path, other school (a throwaway school "B" proves A and B never touch each other),
// audit row with old -> new, and that no error leaks a stack trace. Cleans up after itself
// (audit_log rows are append-only and stay).
import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import { loadEnvLocal } from './lib/env.mjs'
import { call, isEnvelope, jsonOf, signIn } from './lib/http.mjs'

loadEnvLocal()
const env = process.env
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + extra}`) }
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data }

const PATH = '/api/v1/settings'
const tag = randomBytes(3).toString('hex')
let schoolB = null

// Fixture: a second school with its own principal (so the test never edits the demo school).
async function seedSchoolB() {
  const password = randomBytes(12).toString('base64url')
  const s = must(await admin.from('schools').insert({ school_name: `TT api ${tag}`, subdomain: `ttapi${tag}`, email: `api-${tag}@tt.test` }).select('id, subdomain').single(), 'school')
  schoolB = s.id
  must(await admin.from('users').insert({ school_id: s.id, name: 'TT Principal', email: `p-${tag}@tt.test`, password_hash: await bcrypt.hash(password, 10), role: 'principal', is_first_login: false }), 'principal')
  must(await admin.from('school_settings').insert({ school_id: s.id, hijri_offset: -1 }), 'settings')
  return { id: s.id, subdomain: s.subdomain, email: `p-${tag}@tt.test`, password }
}

const hijriOf = async (schoolId) => must(await admin.from('school_settings').select('hijri_offset').eq('school_id', schoolId).single(), 'read').hijri_offset

try {
  const { data: ghs } = await admin.from('schools').select('id').eq('subdomain', 'ghs').single()
  const ghsBefore = await hijriOf(ghs.id)
  const principal = await signIn('principal@ghs.com', env.DEMO_PASSWORD_PRINCIPAL, 'ghs')
  const teacher = await signIn('ahmed@ghs.com', env.DEMO_PASSWORD_TEACHER, 'ghs')
  const B = await seedSchoolB()
  const principalB = await signIn(B.email, B.password, B.subdomain)
  check('fixture: all three users are signed in', principal.has('session-token') && teacher.has('session-token') && principalB.has('session-token'))

  console.log('\n401 — not signed in')
  let r = await call('GET', PATH)
  check('GET signed out -> 401 unauthenticated envelope', r.status === 401 && isEnvelope(await jsonOf(r), 'unauthenticated'), r.status)
  r = await call('PATCH', PATH, { body: { hijri_offset: 0 } })
  check('PATCH signed out -> 401', r.status === 401 && isEnvelope(await jsonOf(r), 'unauthenticated'), r.status)
  r = await call('GET', PATH, { headers: { authorization: 'Bearer abc.def.ghi' } })
  check('bearer token (not enabled yet) -> 401, never anonymous access', r.status === 401 && isEnvelope(await jsonOf(r), 'unauthenticated'), r.status)

  console.log('\n403 — signed in, wrong role')
  r = await call('PATCH', PATH, { as: teacher, body: { hijri_offset: 0 } })
  check('teacher PATCH -> 403 forbidden', r.status === 403 && isEnvelope(await jsonOf(r), 'forbidden'), r.status)
  r = await call('GET', PATH, { as: teacher })
  check('teacher GET (has settings.read) -> 200', r.status === 200, r.status)

  console.log('\n400 / 415 / 422 — input')
  r = await call('PATCH', PATH, { as: principal, raw: '{not json' })
  check('malformed JSON -> 400 bad_request', r.status === 400 && isEnvelope(await jsonOf(r), 'bad_request'), r.status)
  r = await call('PATCH', PATH, { as: principal, raw: 'hijri_offset=1', headers: { 'content-type': 'text/plain' } })
  check('not JSON -> 415', r.status === 415, r.status)
  for (const [name, body, field] of [
    ['out of range (+3)', { hijri_offset: 3 }, 'hijri_offset'],
    ['out of range (-3)', { hijri_offset: -3 }, 'hijri_offset'],
    ['not a number', { hijri_offset: 'one' }, 'hijri_offset'],
    ['not a whole number', { hijri_offset: 0.5 }, 'hijri_offset'],
    ['empty body', {}, 'hijri_offset'],
    ['extra field school_id (never taken from input)', { hijri_offset: 0, school_id: ghs.id }, 'school_id'],
    ['extra field passing_percentage', { hijri_offset: 0, passing_percentage: 1 }, 'passing_percentage'],
  ]) {
    r = await call('PATCH', PATH, { as: principal, body })
    const j = await jsonOf(r)
    check(`${name} -> 422 with fields.${field}`, r.status === 422 && isEnvelope(j, 'validation_failed') && typeof j.error.fields?.[field] === 'string', `${r.status} ${JSON.stringify(j)}`)
  }
  check('nothing above changed the demo school', (await hijriOf(ghs.id)) === ghsBefore)

  console.log('\nHappy path + other school')
  r = await call('PATCH', PATH, { as: principalB, body: { hijri_offset: 1 } })
  let j = await jsonOf(r)
  check('principal B PATCH -> 200 with the saved value', r.status === 200 && j.hijriOffset === 1, `${r.status} ${JSON.stringify(j)}`)
  r = await call('GET', PATH, { as: principalB })
  j = await jsonOf(r)
  check('principal B GET sees its own new value', r.status === 200 && j.hijriOffset === 1, JSON.stringify(j))
  check('school B saved in the database', (await hijriOf(B.id)) === 1)
  check('school A (demo) unchanged by B', (await hijriOf(ghs.id)) === ghsBefore)
  r = await call('GET', PATH, { as: principal })
  j = await jsonOf(r)
  check('principal A GET sees A, not B', r.status === 200 && j.hijriOffset === ghsBefore, JSON.stringify(j))
  r = await call('PATCH', PATH, { as: principalB, body: { hijri_offset: 2, school_id: ghs.id } })
  check("B cannot target A's school_id (422, A unchanged)", r.status === 422 && (await hijriOf(ghs.id)) === ghsBefore, r.status)

  console.log('\nAudit')
  const audit = must(await admin.from('audit_log').select('action, old_data, new_data').eq('school_id', B.id).eq('table_name', 'school_settings').eq('action', 'UPDATE'), 'audit')
  check('the change wrote one audit_log row with old -> new', audit.length === 1 && audit[0].old_data?.hijri_offset === -1 && audit[0].new_data?.hijri_offset === 1, JSON.stringify(audit))
} catch (e) {
  fail++
  console.error('TEST ERROR:', e.message)
} finally {
  if (schoolB) await admin.from('schools').delete().eq('id', schoolB)
  console.log('\ncleanup done')
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
