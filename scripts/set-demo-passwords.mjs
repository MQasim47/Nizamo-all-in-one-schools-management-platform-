// Gives each seeded demo account its own strong random password (the seed ships one shared weak
// password). Updates the database and writes DEMO_PASSWORD_* into .env.local. Prints no passwords.
// Run: npm run demo:passwords      (dev project only; never run against production data you care about)
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const envUrl = new URL('../.env.local', import.meta.url)
const text = existsSync(envUrl) ? readFileSync(envUrl, 'utf8') : ''
for (const line of text.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
}

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const ACCOUNTS = [
  { env: 'DEMO_PASSWORD_SUPERADMIN', email: 'admin@edu4everyone.com', subdomain: 'admin' },
  { env: 'DEMO_PASSWORD_PRINCIPAL', email: 'principal@ghs.com', subdomain: 'ghs' },
  { env: 'DEMO_PASSWORD_TEACHER', email: 'ahmed@ghs.com', subdomain: 'ghs' },
]

const strong = () => randomBytes(18).toString('base64url') // 24 chars, ~144 bits
const out = {}
for (const a of ACCOUNTS) {
  const { data: school } = await db.from('schools').select('id').eq('subdomain', a.subdomain).maybeSingle()
  if (!school) { console.log(`skip ${a.email}: school '${a.subdomain}' not found`); continue }
  const password = strong()
  const hash = await bcrypt.hash(password, 12)
  const { error } = await db.from('users').update({ password_hash: hash }).eq('school_id', school.id).eq('email', a.email)
  if (error) { console.error(`FAILED ${a.email}: ${error.message}`); process.exit(1) }
  out[a.env] = password
  console.log(`updated ${a.email}`)
}

let env = text
for (const [k, v] of Object.entries(out)) {
  const re = new RegExp(`^${k}=.*$`, 'm')
  env = re.test(env) ? env.replace(re, `${k}=${v}`) : env.replace(/\s*$/, `\n${k}=${v}\n`)
}
writeFileSync(envUrl, env)
console.log('Passwords written to .env.local (git-ignored). Set NEXT_PUBLIC_DEMO_MODE=true to show the demo shortcuts.')
