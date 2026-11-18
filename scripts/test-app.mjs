// Live permission checks for the app shell (per-role menus and blocks). The settings API moved to
// /api/v1/settings and is tested by scripts/test-api.mjs (npm run test:api).
//   npm run dev -- -p 3101   then   npm run test:app
// Signs in through NextAuth like a browser does (cookie jar), as the demo principal and teacher.
// Needs the demo accounts (npm run demo:passwords). Changes nothing.
import { createClient } from '@supabase/supabase-js'
import { loadEnvLocal } from './lib/env.mjs'
import { BASE, signIn } from './lib/http.mjs'

// Environment variables win over .env.local (so the same test runs against a local stack).
loadEnvLocal()
const env = process.env
let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + extra}`) }

try {
  const principal = await signIn('principal@ghs.com', env.DEMO_PASSWORD_PRINCIPAL, 'ghs')
  const teacher = await signIn('ahmed@ghs.com', env.DEMO_PASSWORD_TEACHER, 'ghs')

  // The settings API (401/403/400/422, other school, audit) is covered by npm run test:api.
  // Pages: each role sees only its own menu; private pages stay private
  let r
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

  // 4. "Attendance today" counts ONLY the teacher's own classes (regression: it used to count the whole school).
  //    Expected numbers come straight from the database with the service key (read-only).
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  const { data: school } = await admin.from('schools').select('id').eq('subdomain', 'ghs').single()
  const { data: ahmed } = await admin.from('users').select('id').eq('school_id', school.id).eq('email', 'ahmed@ghs.com').single()
  const { data: cls } = await admin.from('classes').select('id').eq('school_id', school.id)
  const { data: ta } = await admin.from('teacher_assignments').select('class_id').eq('school_id', school.id).eq('teacher_id', ahmed.id)
  const allClasses = new Set((cls || []).map((c) => c.id))
  const ownClasses = new Set((ta || []).map((a) => a.class_id).filter((id) => allClasses.has(id))).size
  // the block can arrive in the RSC payload, where the "X of N" value follows the label and detail
  const ofTotal = (text) => Number((text.match(/Attendance today[\s\S]{0,2000}?\b[\d,]+ of ([\d,]+)\b/) || [])[1]?.replace(/,/g, ''))
  if (ownClasses > 0) {
    check(`teacher dashboard: attendance counts only Ahmed's ${ownClasses} assigned class(es), not all ${allClasses.size}`, ofTotal(t) === ownClasses, `shown: ${ofTotal(t)}`)
    const left = Number((t.match(/(\d+)\s+class(?:es)?\s+not marked yet/) || [])[1] || 0)
    check(`teacher dashboard: "not marked" never exceeds the teacher's own classes`, left <= ownClasses, `shown: ${left}`)
  } else {
    check('teacher dashboard: no attendance block when the teacher has no classes', !t.includes('Attendance today'))
  }
  const tp = await html(await page(principal, '/school/dashboard'))
  if (allClasses.size > 0) check(`principal dashboard: attendance counts all ${allClasses.size} classes`, ofTotal(tp) === allClasses.size, `shown: ${ofTotal(tp)}`)

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
