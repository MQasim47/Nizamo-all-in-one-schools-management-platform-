// Pure migration bookkeeping shared by scripts/migrate.mjs and scripts/check-db.mjs (unit-tested in
// tests/migrations.test.mjs). No database access here.
import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

export const FILE_RE = /^(\d{3})_([a-z0-9_]+)\.sql$/

/** Same checksum on Windows and Linux: strip a BOM and normalise CRLF/CR to LF before hashing. */
export function normaliseSql(text) {
  return text.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
}

export function checksum(text) {
  return createHash('sha256').update(normaliseSql(text), 'utf8').digest('hex')
}

/**
 * Older files (002, 003) wrap themselves in BEGIN; ... COMMIT;. The runner already runs every file
 * in its own transaction (so the file and its schema_migrations row commit together), so those
 * standalone lines are dropped IN MEMORY before running. The checksum is always of the file as
 * committed. New migrations must not contain them.
 */
export function stripOuterTransaction(sql) {
  return normaliseSql(sql).replace(/^[ \t]*(BEGIN|COMMIT|START TRANSACTION)[ \t]*;[ \t]*$/gim, '-- ($1 removed by the migration runner)')
}

/** Reads `dir` and returns [{ version, name, file, path, sql, checksum }] sorted by version. */
export function readMigrations(dir) {
  const entries = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.sql'))
  const bad = entries.filter((f) => !FILE_RE.test(f))
  if (bad.length) throw new Error(`Migration file names must look like 006_short_name.sql: ${bad.join(', ')}`)
  const out = entries.map((file) => {
    const [, version, name] = FILE_RE.exec(file)
    const sql = readFileSync(join(dir, file), 'utf8')
    return { version, name, file, path: join(dir, file), sql, checksum: checksum(sql) }
  })
  out.sort((a, b) => a.version.localeCompare(b.version))
  for (let i = 1; i < out.length; i++) {
    if (out[i].version === out[i - 1].version) throw new Error(`Two migration files share version ${out[i].version}`)
  }
  return out
}

/**
 * Compares repo files with schema_migrations rows ({ version, name, checksum }).
 * Returns { pending, problems }. Any problem means: refuse to run.
 *   edited       an applied file's content changed (never edit an applied migration)
 *   missing      a version is recorded in the database but its file is gone
 *   out_of_order a pending file is numbered below the newest applied one
 */
export function planMigrations(files, appliedRows) {
  const applied = new Map(appliedRows.map((r) => [r.version, r]))
  const byVersion = new Map(files.map((f) => [f.version, f]))
  const problems = []

  for (const row of appliedRows) {
    const f = byVersion.get(row.version)
    if (!f) problems.push({ type: 'missing', version: row.version, message: `${row.version}_${row.name}.sql is recorded as applied but the file is missing` })
    else if (f.checksum !== row.checksum) problems.push({ type: 'edited', version: row.version, message: `${f.file} was edited after it was applied (checksum differs). Revert it and put the change in a NEW migration.` })
  }

  const newest = appliedRows.reduce((max, r) => (r.version > max ? r.version : max), '')
  const pending = files.filter((f) => !applied.has(f.version))
  for (const f of pending) {
    if (f.version < newest) problems.push({ type: 'out_of_order', version: f.version, message: `${f.file} is numbered below the newest applied migration (${newest}). Renumber it after ${newest}.` })
  }
  return { pending, problems }
}
