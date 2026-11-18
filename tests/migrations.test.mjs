// Migration bookkeeping (scripts/lib/migrations.mjs): checksums, ordering, refusal rules.
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checksum, planMigrations, readMigrations, stripOuterTransaction } from '../scripts/lib/migrations.mjs'

const f = (version, sql = `-- ${version}`) => ({ version, name: `m${version}`, file: `${version}_m${version}.sql`, checksum: checksum(sql) })
const row = (version, sql = `-- ${version}`) => ({ version, name: `m${version}`, checksum: checksum(sql) })

test('checksum ignores CRLF vs LF and a BOM, but not content', () => {
  assert.equal(checksum('a;\nb;\n'), checksum('a;\r\nb;\r\n'))
  assert.equal(checksum('a;\n'), checksum('﻿a;\n'))
  assert.notEqual(checksum('a;\n'), checksum('a; \n'))
  assert.match(checksum('x'), /^[0-9a-f]{64}$/)
})

test('plan: fresh database -> everything pending, no problems', () => {
  const p = planMigrations([f('001'), f('002')], [])
  assert.deepEqual(p.pending.map((x) => x.version), ['001', '002'])
  assert.deepEqual(p.problems, [])
})

test('plan: applied + new -> only the new one pending', () => {
  const p = planMigrations([f('001'), f('002'), f('003')], [row('001'), row('002')])
  assert.deepEqual(p.pending.map((x) => x.version), ['003'])
  assert.deepEqual(p.problems, [])
})

test('plan: refusal cases', () => {
  for (const [name, files, applied, type] of [
    ['edited applied file', [f('001', 'changed'), f('002')], [row('001'), row('002')], 'edited'],
    ['applied file deleted', [f('001')], [row('001'), row('002')], 'missing'],
    ['new file below newest applied', [f('001'), f('002'), f('003')], [row('001'), row('003')], 'out_of_order'],
  ]) {
    const p = planMigrations(files, applied)
    assert.equal(p.problems.length, 1, name)
    assert.equal(p.problems[0].type, type, name)
  }
})

test('stripOuterTransaction removes standalone BEGIN;/COMMIT; only', () => {
  const sql = 'BEGIN;\nCREATE FUNCTION f() RETURNS int LANGUAGE plpgsql AS $$\nBEGIN\n  RETURN 1;\nEND $$;\nCOMMIT;\n'
  const out = stripOuterTransaction(sql)
  assert.doesNotMatch(out, /^BEGIN;$/m)
  assert.doesNotMatch(out, /^COMMIT;$/m)
  assert.match(out, /^BEGIN$/m, 'plpgsql block BEGIN is kept')
  assert.match(out, /RETURN 1;/)
})

test('readMigrations: sorted, strict names, no duplicate versions', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nz-mig-'))
  try {
    writeFileSync(join(dir, '002_b.sql'), 'select 2;')
    writeFileSync(join(dir, '001_a.sql'), 'select 1;')
    writeFileSync(join(dir, 'README.md'), 'ignored')
    assert.deepEqual(readMigrations(dir).map((m) => m.file), ['001_a.sql', '002_b.sql'])
    writeFileSync(join(dir, '002_c.sql'), 'select 3;')
    assert.throws(() => readMigrations(dir), /share version 002/)
    rmSync(join(dir, '002_c.sql'))
    writeFileSync(join(dir, '3_bad name.sql'), '')
    assert.throws(() => readMigrations(dir), /must look like/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('the repo migrations folder is valid and numbered without gaps', () => {
  const files = readMigrations(fileURLToPath(new URL('../supabase/migrations', import.meta.url)))
  assert.ok(files.length >= 5)
  files.forEach((m, i) => assert.equal(Number(m.version), i + 1, `${m.file} breaks the sequence`))
  for (const m of files.filter((x) => Number(x.version) >= 5)) {
    assert.doesNotMatch(m.sql, /^\s*(BEGIN|COMMIT)\s*;\s*$/im, `${m.file}: the runner wraps each file in a transaction; remove BEGIN/COMMIT`)
  }
})
