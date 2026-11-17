// Live permission checks for the app shell and the school settings API.
//   npm run dev -- -p 3101   then   npm run test:app
// Signs in through NextAuth like a browser does (cookie jar), as the demo principal and teacher.
// Needs the demo accounts (npm run demo:passwords). Changes nothing: every write attempt here is
// either refused or invalid.
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')])
)
const BASE = process.env.TEST_BASE || 'http://localhost:3101'
let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + extra}`) }

function jar() {
  const store = {}
  return {
    absorb(res) {
      for (const c of res.headers.getSetCookie?.() || []) {
        const [kv] = c.split(';')
        const i = kv.indexOf('=')
        store[kv.slice(0, i)] = kv.slice(i + 1)
      }
    },
    header: () => Object.entries(store).map(([k, v]) => `${k}=${v}`).join('; '),
  }
}

async function signIn(email, password, subdomain) {
  const j = jar()
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`)
  j.absorb(csrfRes)
  const { csrfToken } = await csrfRes.json()
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: j.header() },
    body: new URLSearchParams({ csrfToken, email, password, subdomain, json: 'true' }),
  })
  j.absorb(res)
  return j
}

const patch = (j, body, raw) =>
  fetch(`${BASE}/api/school/settings`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', ...(j ? { cookie: j.header() } : {}) },
    body: raw ?? JSON.stringify(body),
  })

try {
  const principal = await signIn('principal@ghs.com', env.DEMO_PASSWORD_PRINCIPAL, 'ghs')
  const teacher = await signIn('ahmed@ghs.com', env.DEMO_PASSWORD_TEACHER, 'ghs')

  // 1. who is allowed to call the settings API
  let r = await patch(null, { hijri_offset: 0 })
  check('settings API: signed out is refused (401)', r.status === 401, r.status)
  r = await patch(teacher, { hijri_offset: 0 })
  check('settings API: a teacher is refused (403)', r.status === 403, r.status)

  // 2. input is validated and whitelisted before anything touches the database
  for (const [name, body] of [
    ['out of range (+3)', { hijri_offset: 3 }],
    ['out of range (-3)', { hijri_offset: -3 }],
    ['not a number', { hijri_offset: 'one' }],
    ['not a whole number', { hijri_offset: 0.5 }],
    ['extra field (school_id) is rejected', { hijri_offset: 0, school_id: '00000000-0000-0000-0000-000000000000' }],
    ['extra field (passing_percentage) is rejected', { hijri_offset: 0, passing_percentage: 1 }],
    ['empty body', {}],
  ]) {
    r = await patch(principal, body)
    check(`settings API: principal, ${name} -> 400`, r.status === 400, r.status)
  }
  r = await patch(principal, null, '{not json')
  check('settings API: malformed JSON -> 400', r.status === 400, r.status)

  // 3. pages: each role sees only its own menu; private pages stay private
  const page = (j, path) => fetch(`${BASE}${path}`, { redirect: 'manual', headers: j ? { cookie: j.header() } : {} })
  r = await page(null, '/school/settings')
  check('settings page: signed out is redirected to login', r.status === 307, r.status)
  r = await page(null, '/design')
  check('/design is reachable in development (404 in production, checked in the build step)', r.status === 200, r.status)

  const html = async (res) => (await res.text()).replace(/<[^>]+>/g, ' ')
  let t = await html(await page(principal, '/school/dashboard'))
  check('principal dashboard: school menu shows Dashboard and School settings', t.includes('School settings') && t.includes('Dashboard'))
  check('principal dashboard: no menu item for unbuilt modules (Students, Fees, Attendance)', !/>\s*(Students|Fees|Attendance)\s*</.test((await (await page(principal, '/school/dashboard')).text())))
  t = await html(await page(teacher, '/school/dashboard'))
  check('teacher dashboard: no "School settings" menu item', !t.includes('School settings'))
  check('teacher dashboard: no recent-activity block (needs audit permission)', !t.includes('Recent activity'))
  check('teacher dashboard: no setup checklist (needs settings permission)', !t.includes('Set up your school'))

  r = await page(teacher, '/admin/waitlist')
  check('teacher cannot open the admin waitlist (redirected)', r.status === 307, r.status)
  r = await page(principal, '/admin/waitlist')
  check('principal cannot open the admin waitlist (redirected)', r.status === 307, r.status)
} catch (e) {
  fail++
  console.log('TEST ERROR:', e.message)
}
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
