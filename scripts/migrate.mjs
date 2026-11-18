// Database migrations: npm run migrate | npm run db:status | npm run migrate -- --baseline 004
//
// Applies pending files from supabase/migrations in order. Each file runs in ONE transaction
// together with its schema_migrations row (all or nothing). Refuses to run when an applied file was
// edited, an applied file is missing, or a new file is numbered below the newest applied one.
//
// Needs DATABASE_URL (direct Postgres connection string; for Supabase use the Session pooler URI,
// see .env.local.example). The connection string is never printed.
//
// Options:
//   --status          show applied / pending, change nothing (exit 1 on problems)
//   --dry-run         show what would be applied, change nothing
//   --baseline NNN    record 001..NNN as already applied WITHOUT running them (one-time, for a
//                     database that was set up by hand). Only allowed when nothing is recorded yet.
//   --dir PATH        migrations folder (tests only)
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import pg from 'pg'
import { isLocalHost, loadEnvLocal } from './lib/env.mjs'
import { planMigrations, readMigrations, stripOuterTransaction } from './lib/migrations.mjs'

const DEFAULT_DIR = fileURLToPath(new URL('../supabase/migrations', import.meta.url))
const LOCK_KEY = 7_202_607 // pg advisory lock id for "nizamo migrate"

// What a hand-applied database must already contain before --baseline may record a version.
const BASELINE_PROBES = {
  '001': `SELECT to_regclass('public.schools') IS NOT NULL AND to_regclass('public.fee_payments') IS NOT NULL`,
  '002': `SELECT to_regclass('public.audit_log') IS NOT NULL AND to_regclass('public.role_permissions') IS NOT NULL AND to_regprocedure('app.can(text)') IS NOT NULL`,
  '003': `SELECT to_regclass('public.waitlist') IS NOT NULL`,
  '004': `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'school_settings' AND column_name = 'hijri_offset')`,
}

const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version       TEXT PRIMARY KEY CHECK (version ~ '^[0-9]{3}$'),
  name          TEXT NOT NULL,
  checksum      TEXT NOT NULL CHECK (checksum ~ '^[0-9a-f]{64}$'),
  applied_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_by    TEXT NOT NULL DEFAULT current_user,
  execution_ms  INTEGER,
  baseline      BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.schema_migrations FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN EXECUTE 'REVOKE ALL ON public.schema_migrations FROM anon'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN EXECUTE 'REVOKE ALL ON public.schema_migrations FROM authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN EXECUTE 'GRANT SELECT ON public.schema_migrations TO service_role'; END IF;
END $$;`

function parseArgs(argv) {
  const args = { status: false, dryRun: false, baseline: null, dir: DEFAULT_DIR }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--status') args.status = true
    else if (a === '--dry-run') args.dryRun = true
    else if (a === '--baseline') args.baseline = argv[++i]
    else if (a === '--dir') args.dir = resolve(argv[++i])
    else throw new Error(`Unknown option: ${a}`)
  }
  if (args.baseline !== null && !/^\d{3}$/.test(args.baseline || '')) throw new Error('--baseline needs a 3-digit version, e.g. --baseline 004')
  return args
}

let secrets = []
const redact = (s) => secrets.reduce((out, x) => (x ? out.split(x).join('***') : out), String(s))
const say = (s = '') => console.log(redact(s))
const fail = (s) => {
  console.error(redact(`\nmigrate: ${s}`))
  process.exitCode = 1
}

function connectionConfig(raw) {
  let url
  try {
    url = new URL(raw)
  } catch {
    throw new Error('DATABASE_URL is not a valid postgres:// connection string')
  }
  if (!/^postgres(ql)?:$/.test(url.protocol)) throw new Error('DATABASE_URL must start with postgresql://')
  secrets = [raw, decodeURIComponent(url.password || ''), url.password].filter((s) => s && s.length >= 3)
  const local = isLocalHost(url.hostname)

  if (process.env.CI && !local) {
    throw new Error('Refusing to run in CI against a non-local database. CI only migrates its own throwaway Postgres.')
  }

  url.searchParams.delete('sslmode') // TLS is configured below instead
  let ssl = false
  if (!local) {
    const caPath = process.env.DATABASE_SSL_CA
    ssl = caPath ? { ca: readFileSync(caPath, 'utf8'), rejectUnauthorized: true } : { rejectUnauthorized: false }
  }
  return {
    config: { connectionString: url.toString(), ssl, application_name: 'nizamo-migrate', connectionTimeoutMillis: 15000 },
    target: `${url.hostname}${url.port ? ':' + url.port : ''}/${url.pathname.slice(1) || 'postgres'}`,
    verified: !ssl || ssl.rejectUnauthorized,
    local,
  }
}

async function tableExists(client) {
  const { rows } = await client.query(`SELECT to_regclass('public.schema_migrations') IS NOT NULL AS ok`)
  return rows[0].ok
}

async function appliedRows(client) {
  if (!(await tableExists(client))) return []
  const { rows } = await client.query('SELECT version, name, checksum, applied_at, baseline FROM public.schema_migrations ORDER BY version')
  return rows
}

function printStatus(files, applied, pending, problems) {
  const appliedSet = new Map(applied.map((r) => [r.version, r]))
  say('')
  for (const f of files) {
    const row = appliedSet.get(f.version)
    const state = row ? (row.baseline ? 'applied (baseline)' : 'applied') : 'PENDING'
    say(`  ${f.version}  ${state.padEnd(19)} ${f.file}`)
  }
  for (const p of problems) say(`  !!   ${p.message}`)
  say('')
  say(problems.length ? `${problems.length} problem(s): fix them before migrating.` : pending.length ? `${pending.length} pending.` : 'Database is up to date.')
}

async function main() {
  loadEnvLocal()
  const args = parseArgs(process.argv.slice(2))
  const raw = process.env.DATABASE_URL
  if (!raw) {
    return fail('DATABASE_URL is not set. Add the Supabase Session pooler connection string to .env.local (see .env.local.example).')
  }
  const { config, target, verified } = connectionConfig(raw)
  const files = readMigrations(args.dir)

  const client = new pg.Client(config)
  await client.connect()
  say(`Database: ${target}${verified ? '' : '  (TLS on; server certificate not verified: set DATABASE_SSL_CA to verify it)'}`)

  try {
    const { rows: lock } = await client.query('SELECT pg_try_advisory_lock($1) AS ok', [LOCK_KEY])
    if (!lock[0].ok) return fail('Another migration run is in progress. Try again in a minute.')

    if (args.status || args.dryRun) {
      const applied = await appliedRows(client)
      const { pending, problems } = planMigrations(files, applied)
      if (!(await tableExists(client))) say('schema_migrations does not exist yet (nothing recorded).')
      printStatus(files, applied, pending, problems)
      if (args.dryRun && !problems.length) for (const f of pending) say(`  would apply ${f.file}`)
      if (problems.length) process.exitCode = 1
      return
    }

    await client.query(BOOTSTRAP_SQL)
    const applied = await appliedRows(client)

    if (args.baseline) {
      if (applied.length) return fail(`--baseline is only for a database with nothing recorded (found ${applied.length} rows). Use npm run migrate.`)
      const toRecord = files.filter((f) => f.version <= args.baseline)
      if (!toRecord.length || toRecord[toRecord.length - 1].version !== args.baseline) return fail(`No migration file with version ${args.baseline}.`)
      const probes = args.dir === DEFAULT_DIR ? BASELINE_PROBES : {}
      for (const f of toRecord) {
        if (!probes[f.version]) continue
        const { rows } = await client.query(probes[f.version])
        if (!Object.values(rows[0])[0]) return fail(`${f.file} does not look applied on this database. Baseline refused; nothing recorded.`)
      }
      await client.query('BEGIN')
      for (const f of toRecord) {
        await client.query('INSERT INTO public.schema_migrations (version, name, checksum, baseline) VALUES ($1, $2, $3, true)', [f.version, f.name, f.checksum])
      }
      await client.query('COMMIT')
      say(`Baseline recorded: ${toRecord.map((f) => f.version).join(', ')} (not run; marked as already applied).`)
      const after = planMigrations(files, await appliedRows(client))
      say(after.pending.length ? `Pending now: ${after.pending.map((f) => f.file).join(', ')}. Run npm run migrate.` : 'Nothing pending.')
      return
    }

    const { pending, problems } = planMigrations(files, applied)
    if (problems.length) {
      printStatus(files, applied, pending, problems)
      return fail('Refusing to migrate. Nothing was changed.')
    }
    if (!pending.length) {
      say('Nothing to apply. Database is up to date.')
      return
    }

    for (const f of pending) {
      const started = Date.now()
      try {
        await client.query('BEGIN')
        await client.query(`SET LOCAL lock_timeout = '10s'`)
        await client.query(`SET LOCAL statement_timeout = '5min'`)
        await client.query(stripOuterTransaction(f.sql))
        await client.query(
          'INSERT INTO public.schema_migrations (version, name, checksum, execution_ms) VALUES ($1, $2, $3, $4)',
          [f.version, f.name, f.checksum, Date.now() - started]
        )
        await client.query('COMMIT')
        say(`  applied ${f.file} (${Date.now() - started} ms)`)
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {})
        const where = err.position ? ` near character ${err.position}` : ''
        return fail(`${f.file} failed and was rolled back: ${err.message}${err.code ? ` [${err.code}]` : ''}${where}. Later migrations were not run.`)
      }
    }
    say(`Done: ${pending.length} migration(s) applied.`)
  } finally {
    await client.end().catch(() => {})
  }
}

main().catch((err) => fail(err.message))
