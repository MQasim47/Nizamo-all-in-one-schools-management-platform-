// Migration runner test: npm run test:migrate
// Needs TEST_DATABASE_URL pointing at a LOCAL Postgres (CI: the throwaway Supabase stack; locally:
// `npx supabase start --workdir ci`, see docs/CI.md). Creates a scratch database, runs
// scripts/migrate.mjs against tiny fixture migrations, and drops the database at the end.
// It never touches the dev or any remote database (refuses non-local hosts).
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import pg from 'pg'
import { isLocalHost } from './lib/env.mjs'

const raw = process.env.TEST_DATABASE_URL
if (!raw) {
  console.error('TEST_DATABASE_URL is not set (a local Postgres, e.g. postgresql://postgres:postgres@127.0.0.1:54322/postgres)')
  process.exit(1)
}
const base = new URL(raw)
if (!isLocalHost(base.hostname)) {
  console.error('test:migrate only runs against a local database')
  process.exit(1)
}

const MIGRATE = fileURLToPath(new URL('./migrate.mjs', import.meta.url))
const dbName = `nizamo_migrate_test_${randomBytes(4).toString('hex')}`
const testUrl = new URL(raw)
testUrl.pathname = `/${dbName}`
const dir = mkdtempSync(join(tmpdir(), 'nizamo-migrate-'))

let pass = 0, fail = 0
const check = (name, ok, extra = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + extra}`) }

const file = (name, sql) => writeFileSync(join(dir, name), sql)
const run = (args = [], env = {}) => {
  const r = spawnSync(process.execPath, [MIGRATE, '--dir', dir, ...args], {
    env: { ...process.env, DATABASE_URL: testUrl.toString(), ...env },
    encoding: 'utf8',
  })
  return { code: r.status, out: `${r.stdout}\n${r.stderr}` }
}

const adminDb = new pg.Client({ connectionString: raw })
await adminDb.connect()
await adminDb.query(`CREATE DATABASE ${dbName}`)
const db = new pg.Client({ connectionString: testUrl.toString() })
await db.connect()
const exists = async (t) => (await db.query(`SELECT to_regclass($1) IS NOT NULL AS ok`, [t])).rows[0].ok
const recorded = async () => (await db.query('SELECT version FROM schema_migrations ORDER BY version')).rows.map((r) => r.version).join(',')
const password = decodeURIComponent(base.password || '')
const leaks = (out) => out.includes(raw) || (password.length >= 3 && out.includes(password))

try {
  // 1. fresh apply, including an old-style file that wraps itself in BEGIN; ... COMMIT;
  file('001_first.sql', 'CREATE TABLE t1 (id int);\n')
  file('002_second.sql', 'BEGIN;\nCREATE TABLE t2 (id int);\nCREATE FUNCTION f2() RETURNS int LANGUAGE plpgsql AS $$\nBEGIN\n  RETURN 2;\nEND $$;\nCOMMIT;\n')
  let r = run()
  check('fresh database: applies 001 and 002', r.code === 0 && (await exists('t1')) && (await exists('t2')), r.out)
  check('both recorded in schema_migrations with checksums', (await recorded()) === '001,002')
  check('plpgsql BEGIN inside a function body is untouched', (await db.query('SELECT f2() AS v')).rows[0].v === 2)
  check('connection string / password never printed', !leaks(r.out))

  // 2. idempotent re-run
  r = run()
  check('second run: nothing to apply', r.code === 0 && /Nothing to apply/.test(r.out), r.out)

  // 3. a failing migration is rolled back completely and not recorded
  file('003_broken.sql', 'CREATE TABLE t3 (id int);\nSELECT 1/0;\n')
  file('004_after.sql', 'CREATE TABLE t4 (id int);\n')
  r = run()
  check('failing 003: exit code 1, error names the file', r.code === 1 && /003_broken\.sql failed and was rolled back/.test(r.out), r.out)
  check('failing 003: its table was rolled back', !(await exists('t3')))
  check('failing 003: not recorded, and 004 did not run', (await recorded()) === '001,002' && !(await exists('t4')))

  // 4. fixed 003 applies, then 004
  file('003_broken.sql', 'CREATE TABLE t3 (id int);\n')
  r = run()
  check('fixed 003 and 004 apply in order', r.code === 0 && (await recorded()) === '001,002,003,004', r.out)

  // 5. Windows line endings do not count as an edit
  file('001_first.sql', 'CREATE TABLE t1 (id int);\r\n')
  r = run()
  check('CRLF line endings: same checksum, nothing to apply', r.code === 0 && /Nothing to apply/.test(r.out), r.out)

  // 6. an edited applied file blocks everything
  file('001_first.sql', 'CREATE TABLE t1 (id int, extra text);\n')
  file('005_next.sql', 'CREATE TABLE t5 (id int);\n')
  r = run()
  check('edited 001: refused with "was edited after it was applied"', r.code === 1 && /001_first\.sql was edited after it was applied/.test(r.out), r.out)
  check('edited 001: pending 005 was NOT applied', !(await exists('t5')))
  r = run(['--status'])
  check('db:status reports the edit and exits 1', r.code === 1 && /edited after it was applied/.test(r.out), r.out)
  file('001_first.sql', 'CREATE TABLE t1 (id int);\n')
  r = run()
  check('after reverting 001: 005 applies', r.code === 0 && (await exists('t5')), r.out)

  // 7. a new file numbered below the newest applied one
  unlinkSync(join(dir, '004_after.sql'))
  file('006_last.sql', 'CREATE TABLE t6 (id int);\n')
  r = run()
  check('deleted applied file 004: refused ("file is missing")', r.code === 1 && /recorded as applied but the file is missing/.test(r.out), r.out)
  file('004_after.sql', 'CREATE TABLE t4 (id int);\n')
  await db.query(`DELETE FROM schema_migrations WHERE version = '004'`)
  r = run()
  check('pending 004 below applied 005: refused as out of order', r.code === 1 && /numbered below the newest applied migration/.test(r.out) && !(await exists('t6')), r.out)

  // 8. baseline on a database set up by hand
  await db.query('DROP TABLE schema_migrations')
  r = run(['--baseline', '003'])
  check('baseline 003 records 001-003 without running them', r.code === 0 && (await recorded()) === '001,002,003', r.out)
  r = run(['--baseline', '003'])
  check('baseline refuses when anything is already recorded', r.code === 1 && /only for a database with nothing recorded/.test(r.out), r.out)
  await db.query('DROP TABLE t4, t5')
  r = run()
  check('after baseline: 004, 005, 006 apply', r.code === 0 && (await recorded()) === '001,002,003,004,005,006', r.out)

  // 9. CI guard: never a remote database from CI (fails before connecting)
  r = run([], { CI: 'true', DATABASE_URL: 'postgresql://postgres.ref:sup3r-secret-pw@aws-0-x.pooler.supabase.com:5432/postgres' })
  check('CI + remote DATABASE_URL: refused', r.code === 1 && /Refusing to run in CI against a non-local database/.test(r.out), r.out)
  check('CI guard output does not contain the password', !r.out.includes('sup3r-secret-pw'))

  // 10. migrations table hidden from API roles
  const grants = (await db.query(`SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name = 'schema_migrations' AND grantee IN ('anon', 'authenticated')`)).rows
  check('schema_migrations: no grants to anon/authenticated', grants.length === 0, JSON.stringify(grants))
  const rls = (await db.query(`SELECT relrowsecurity FROM pg_class WHERE relname = 'schema_migrations'`)).rows[0]
  check('schema_migrations: row-level security on', rls?.relrowsecurity === true)
} catch (e) {
  fail++
  console.error('TEST ERROR:', e.message)
} finally {
  await db.end().catch(() => {})
  await adminDb.query(`DROP DATABASE IF EXISTS ${dbName} WITH (FORCE)`).catch(() => {})
  await adminDb.end().catch(() => {})
  rmSync(dir, { recursive: true, force: true })
}

console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
