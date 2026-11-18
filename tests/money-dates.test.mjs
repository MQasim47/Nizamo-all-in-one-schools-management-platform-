// Money (whole rupees) and Pakistan-date helpers added in Session 7.
import test from 'node:test'
import assert from 'node:assert/strict'
import { formatRs, sumRupees, toRupees } from '../lib/utils/money.mjs'
import { positiveRupeesSchema, rupeesSchema } from '../lib/validation/money.mjs'
import { addDaysPk, isValidDate, pkDayRange, toPkDate, todayPk } from '../lib/utils/dates.mjs'
import { pkDateSchema } from '../lib/validation/dates.mjs'

test('formatRs: whole rupees only, Pakistani grouping', () => {
  for (const [input, out] of [
    [0, 'Rs. 0'],
    [999, 'Rs. 999'],
    [1000, 'Rs. 1,000'],
    [1840000, 'Rs. 18,40,000'],
    [123456789, 'Rs. 12,34,56,789'],
    [-4500, '-Rs. 4,500'],
    ['2500', 'Rs. 2,500'],
    [2500n, 'Rs. 2,500'],
    [6500.5, 'Rs. 6,501'],
    [-6500.5, '-Rs. 6,501'],
    [0.4, 'Rs. 0'],
    [null, 'Rs. 0'],
    ['abc', 'Rs. 0'],
  ]) assert.equal(formatRs(input), out, String(input))
})

test('toRupees accepts integers, bigint and integer strings; rejects the rest', () => {
  assert.equal(toRupees(2500), 2500)
  assert.equal(toRupees(2500n), 2500)
  assert.equal(toRupees('2500'), 2500)
  assert.equal(toRupees(' -40 '), -40)
  for (const bad of [2.5, '2.5', '1e3', NaN, Infinity, null, undefined, '', '12abc', 2 ** 60, '9007199254740993'])
    assert.throws(() => toRupees(bad), TypeError, String(bad))
})

test('sumRupees adds exactly (no float drift)', () => {
  assert.equal(sumRupees([]), 0)
  assert.equal(sumRupees([1500, '2500', 3000n]), 7000)
  assert.equal(sumRupees(Array(1000).fill(1)), 1000)
  assert.throws(() => sumRupees([100, 0.1]), TypeError)
  assert.throws(() => sumRupees([Number.MAX_SAFE_INTEGER, 1]), RangeError)
})

test('rupeesSchema: whole, non-negative, bounded', () => {
  assert.equal(rupeesSchema.parse(2500), 2500)
  assert.equal(rupeesSchema.parse('2500'), 2500)
  assert.equal(rupeesSchema.parse(0), 0)
  for (const bad of [2500.5, -1, 'abc', 1e11]) assert.equal(rupeesSchema.safeParse(bad).success, false, String(bad))
  assert.equal(positiveRupeesSchema.safeParse(0).success, false)
  assert.equal(positiveRupeesSchema.parse(1), 1)
})

test('isValidDate / pkDateSchema: real calendar dates only', () => {
  for (const ok of ['2026-11-18', '2028-02-29', '2026-12-31', '2026-01-01']) assert.ok(isValidDate(ok), ok)
  for (const bad of ['2026-02-29', '2026-02-30', '2026-13-01', '2026-00-10', '26-11-18', '2026-11-18T00:00', '', null, 20261118])
    assert.equal(isValidDate(bad), false, String(bad))
  assert.equal(pkDateSchema.parse(' 2026-11-18 '), '2026-11-18')
  assert.equal(pkDateSchema.safeParse('2026-02-30').success, false)
})

test('toPkDate: the Pakistan date, not the UTC date', () => {
  assert.equal(toPkDate('2026-11-18T18:59:59Z'), '2026-11-18')
  assert.equal(toPkDate('2026-11-18T19:00:00Z'), '2026-11-19') // 00:00 in Karachi
  assert.equal(toPkDate(new Date('2026-12-31T20:00:00Z')), '2027-01-01')
  assert.equal(toPkDate('2026-11-18T19:00:00Z'), todayPk(new Date('2026-11-18T19:00:00Z')))
  assert.throws(() => toPkDate('nope'), RangeError)
})

test('addDaysPk: month, year and leap-year boundaries', () => {
  for (const [d, n, out] of [
    ['2026-02-28', 1, '2026-03-01'],
    ['2028-02-28', 1, '2028-02-29'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2026-11-18', 0, '2026-11-18'],
    ['2026-11-18', 30, '2026-12-18'],
  ]) assert.equal(addDaysPk(d, n), out, `${d} ${n}`)
  assert.throws(() => addDaysPk('2026-02-30', 1), RangeError)
})

test('pkDayRange: one Pakistan day in UTC (UTC+5, no DST)', () => {
  assert.deepEqual(pkDayRange('2026-11-18'), { start: '2026-11-17T19:00:00.000Z', end: '2026-11-18T19:00:00.000Z' })
  assert.deepEqual(pkDayRange('2027-01-01'), { start: '2026-12-31T19:00:00.000Z', end: '2027-01-01T19:00:00.000Z' })
  const { start, end } = pkDayRange('2026-06-15')
  assert.equal(toPkDate(start), '2026-06-15')
  assert.equal(toPkDate(new Date(new Date(end).getTime() - 1)), '2026-06-15')
  assert.equal(toPkDate(end), '2026-06-16')
})
