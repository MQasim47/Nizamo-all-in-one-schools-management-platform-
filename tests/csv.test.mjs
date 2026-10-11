import test from 'node:test'
import assert from 'node:assert/strict'
import { toCsv } from '../lib/utils/csv.mjs'

test('CSV quotes cells and escapes quotes', () => {
  assert.equal(toCsv(['a', 'b'], [{ a: 'x,y', b: 'say "hi"' }]), 'a,b\r\n"x,y","say ""hi"""')
})

test('CSV neutralises spreadsheet formula injection', () => {
  const out = toCsv(['a'], [{ a: '=HYPERLINK("http://evil")' }, { a: '+1' }, { a: '-2' }, { a: '@cmd' }])
  for (const line of out.split('\r\n').slice(1)) assert.match(line, /^"'/)
})

test('CSV handles null/undefined as empty', () => {
  assert.equal(toCsv(['a', 'b'], [{ a: null }]), 'a,b\r\n"",""')
})
