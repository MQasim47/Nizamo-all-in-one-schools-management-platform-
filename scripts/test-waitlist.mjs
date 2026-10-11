// Waitlist API test. Run against a running server, with migration 003 applied:
//   npm run dev -- -p 3100        (in another terminal)
//   TEST_BASE=http://localhost:3100 npm run test:waitlist
// Uses a unique fake client IP per case (x-forwarded-for) so it never trips the limiter for real
// visitors, creates one throwaway row, and removes it afterwards.
import { readFileSync, existsSync } from 'node:fs'
import { randomInt } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

const envUrl = new URL('../.env.local', import.meta.url)
if (existsSync(envUrl)) {
  for (const line of readFileSync(envUrl, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
const BASE = process.env.TEST_BASE || 'http://localhost:3100'
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + extra}`) }

const run = randomInt(100000, 999999)
let ipSeq = 0
const ip = () => `10.${run % 250}.${(run >> 3) % 250}.${++ipSeq}`
const post = (body, headers = {}) =>
  fetch(`${BASE}/api/waitlist`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip(), ...headers }, body: JSON.stringify(body) })

const digits = String(randomInt(100000000, 999999999)) // 9 digits after the leading 3
const local = `03${digits.slice(0, 1)}${digits.slice(1)}`.slice(0, 11) // 03XXXXXXXXX
const e164 = `+92${local.slice(1)}`
const valid = { school_name: `Test School ${run}`, contact_name: 'Test Person', city: 'Lahore', student_count_range: '100_300', whatsapp: local, email: `T${run}@Example.com`, source: 'utm_source=test' }
const rowByPhone = async (p) => (await admin.from('waitlist').select('*').eq('whatsapp', p)).data || []

try {
  // 1 validation
  let r = await post({ school_name: 'x' })
  let j = await r.json()
  check('rejects an incomplete form with field errors (400)', r.status === 400 && j.errors?.school_name && j.errors?.whatsapp, JSON.stringify(j))

  r = await post({ ...valid, whatsapp: '0211234567' })
  j = await r.json()
  check('rejects a non-mobile phone number', r.status === 400 && !!j.errors?.whatsapp, JSON.stringify(j))

  r = await post({ ...valid, student_count_range: 'huge' })
  check('rejects an unknown student range', r.status === 400)

  r = await fetch(`${BASE}/api/waitlist`, { method: 'POST', headers: { 'content-type': 'text/plain', 'x-forwarded-for': ip() }, body: 'x' })
  check('rejects non-JSON requests (415)', r.status === 415)

  // 2 honeypot
  const hpPhone = `+923${String(randomInt(100000000, 999999999))}`
  r = await post({ ...valid, whatsapp: hpPhone, website: 'http://spam.example' })
  j = await r.json()
  check('honeypot: bot gets a fake success', r.status === 200 && j.ok === true)
  check('honeypot: nothing was stored', (await rowByPhone(hpPhone)).length === 0)

  // 3 happy path + normalisation
  r = await post(valid)
  j = await r.json()
  check('valid submission succeeds', r.status === 200 && j.ok === true && !j.duplicate, JSON.stringify(j))
  const rows = await rowByPhone(e164)
  check('phone stored normalised as +923XXXXXXXXX', rows.length === 1, `looked for ${e164}`)
  check('email lowercased, status defaults to new, source kept', rows[0]?.email === `t${run}@example.com` && rows[0]?.status === 'new' && rows[0]?.source === 'utm_source=test')

  // 4 duplicate WhatsApp in a different format
  r = await post({ ...valid, school_name: 'Other name', whatsapp: `+92 ${local.slice(1, 4)}-${local.slice(4)}` })
  j = await r.json()
  check('duplicate WhatsApp (different format) is detected', r.status === 200 && j.duplicate === true, JSON.stringify(j))
  check('duplicate did not create a second row', (await rowByPhone(e164)).length === 1)

  // 5 no direct database access for visitors
  const sel = await anon.from('waitlist').select('*')
  check('anon cannot read the waitlist table', !!sel.error || (sel.data || []).length === 0)
  const ins = await anon.from('waitlist').insert({ school_name: 'x', contact_name: 'x', city: 'x', student_count_range: 'under_100', whatsapp: '+923001112223' })
  check('anon cannot insert into the waitlist table', !!ins.error)
  const upd = await anon.from('waitlist').update({ status: 'converted' }).eq('whatsapp', e164).select()
  check('anon cannot update the waitlist table', !!upd.error || (upd.data || []).length === 0)

  // 6 admin endpoints need a super admin
  r = await fetch(`${BASE}/admin/waitlist/export`, { redirect: 'manual' })
  check('CSV export is not public', [307, 401, 403].includes(r.status), `status ${r.status}`)
  r = await fetch(`${BASE}/api/admin/waitlist/${crypto.randomUUID()}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status: 'demo' }) })
  check('status change requires sign-in (401)', r.status === 401, `status ${r.status}`)
  r = await fetch(`${BASE}/admin/waitlist`, { redirect: 'manual' })
  check('/admin/waitlist redirects visitors to sign-in', r.status === 307 && (r.headers.get('location') || '').includes('/login'), `status ${r.status}`)

  // 7 register is closed while NEXT_PUBLIC_SIGNUP_OPEN is not "true"
  if (process.env.NEXT_PUBLIC_SIGNUP_OPEN !== 'true') {
    r = await fetch(`${BASE}/api/register`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-forwarded-for': ip() }, body: '{}' })
    check('POST /api/register is refused while signup is closed (403)', r.status === 403, `status ${r.status}`)
  }

  // 8 rate limit: 5 requests per hour per IP, the 6th is refused
  const fixed = `172.16.${run % 250}.${(run >> 4) % 250}`
  const codes = []
  for (let i = 0; i < 6; i++) {
    const res = await post({ school_name: 'x' }, { 'x-forwarded-for': fixed })
    codes.push(res.status)
  }
  check('rate limit: first 5 are processed, the 6th is 429', codes.slice(0, 5).every((c) => c === 400) && codes[5] === 429, codes.join(','))
} catch (e) {
  fail++
  console.error('TEST ERROR:', e.message)
} finally {
  await admin.from('waitlist').delete().eq('whatsapp', e164)
  console.log('\ncleanup done')
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
