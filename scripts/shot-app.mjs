// Dev helper: sign in through the real login page and screenshot app pages.
// node scripts/shot-app.mjs <outDir>   (needs the dev server on :3100 and demo passwords in .env.local)
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright-core'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const out = process.argv[2]
const BASE = 'http://localhost:3100'
const b = await chromium.launch({ channel: 'chrome' })
const errors = []

async function session(width, school, email, pw) {
  const ctx = await b.newContext({ viewport: { width, height: 820 }, deviceScaleFactor: 1 })
  const p = await ctx.newPage()
  p.on('console', (m) => m.type() === 'error' && errors.push(`${width}: ${m.text().slice(0, 160)}`))
  p.on('pageerror', (e) => errors.push(`${width} pageerror: ${e.message.slice(0, 160)}`))
  await p.goto(`${BASE}/login?school=${school}`, { waitUntil: 'networkidle' })
  return { p, ctx }
}
async function login(p, email, pw) {
  await p.locator('input[type=email]').fill(email)
  await p.locator('input[autocomplete="current-password"]').fill(pw)
  await p.getByRole('button', { name: /sign in/i }).click()
  await p.waitForURL('**/school/dashboard', { timeout: 20000 })
  await p.waitForLoadState('networkidle')
}

for (const w of [1366, 360]) {
  const { p, ctx } = await session(w, 'ghs')
  await p.screenshot({ path: `${out}/login-${w}.png` })
  // wrong password
  await p.locator('input[type=email]').fill('principal@ghs.com')
  await p.locator('input[autocomplete="current-password"]').fill('definitely-wrong')
  await p.getByRole('button', { name: /sign in/i }).click()
  await p.getByText('Incorrect email or password').waitFor()
  await p.screenshot({ path: `${out}/login-error-${w}.png` })
  await login(p, 'principal@ghs.com', env.DEMO_PASSWORD_PRINCIPAL)
  await p.getByText('Today at a glance').waitFor({ timeout: 30000 })
  await p.screenshot({ path: `${out}/dash-${w}.png`, fullPage: true })
  await p.goto(`${BASE}/school/settings?school=ghs`, { waitUntil: 'networkidle' })
  await p.getByText('Hijri date adjustment').first().waitFor({ timeout: 30000 })
  await p.screenshot({ path: `${out}/settings-${w}.png` })
  await ctx.close()
}
{
  const { p, ctx } = await session(1366, 'admin')
  await login(p, 'admin@edu4everyone.com', env.DEMO_PASSWORD_SUPERADMIN)
  await p.getByText(/No new requests|New waitlist requests/).waitFor({ timeout: 30000 })
  await p.screenshot({ path: `${out}/admin-dash.png` })
  await p.goto(`${BASE}/admin/waitlist`, { waitUntil: 'networkidle' })
  await p.getByRole('heading', { name: /waitlist/i }).waitFor({ timeout: 30000 })
  await p.screenshot({ path: `${out}/admin-waitlist.png` })
  await ctx.close()
}
console.log(errors.length ? errors.join('\n') : 'no console errors')
await b.close()
