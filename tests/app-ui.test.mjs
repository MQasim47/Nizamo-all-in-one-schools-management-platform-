import test from 'node:test'
import assert from 'node:assert/strict'
import { formatNumber, formatRs } from '../lib/utils/money.mjs'
import { clampHijriOffset, DEFAULT_HIJRI_OFFSET, formatHijri, formatWhenPk, greetingPk, monthStartPk, todayPk } from '../lib/utils/dates.mjs'
import { buildNav, isBuilt } from '../lib/nav.mjs'
import { COLORS, FULL, SIMPLE, markFor } from '../lib/brand-mark.mjs'

test('money uses Pakistani digit grouping', () => {
  assert.equal(formatRs(1840000), 'Rs. 18,40,000')
  assert.equal(formatRs(310000), 'Rs. 3,10,000')
  assert.equal(formatNumber(999), '999')
  assert.equal(formatNumber(1000), '1,000')
  assert.equal(formatNumber(100000), '1,00,000')
  assert.equal(formatNumber(12345678), '1,23,45,678')
  assert.equal(formatRs(6500.5), 'Rs. 6,500.50')
  assert.equal(formatRs(-4500), '-Rs. 4,500')
  assert.equal(formatRs('2500'), 'Rs. 2,500')
})

test('money handles empty and bad input as zero', () => {
  for (const v of [null, undefined, '', 'abc', NaN]) assert.equal(formatNumber(v), '0')
})

test('Hijri adjustment: default -1, clamped to -2..+2, shifts the date by whole days', () => {
  assert.equal(DEFAULT_HIJRI_OFFSET, -1)
  assert.equal(clampHijriOffset(3), -1)
  assert.equal(clampHijriOffset('x'), -1)
  assert.equal(clampHijriOffset(2), 2)
  assert.equal(clampHijriOffset(-2), -2)
  const d = new Date('2026-10-20T08:00:00Z') // mid-month, so no month rollover
  const day = (o) => Number(formatHijri(d, o).split(' ')[0])
  // same month, so each +1 offset is exactly one day later
  assert.equal(day(0) - day(-1), 1)
  assert.equal(day(1) - day(0), 1)
  assert.match(formatHijri(d), /^\d{1,2} .+ 14\d\d$/)
})

test('greeting follows Pakistan time, not UTC', () => {
  assert.equal(greetingPk(new Date('2026-10-11T02:00:00Z')), 'Good morning') // 07:00 PKT
  assert.equal(greetingPk(new Date('2026-10-11T09:00:00Z')), 'Good afternoon') // 14:00 PKT
  assert.equal(greetingPk(new Date('2026-10-11T15:00:00Z')), 'Good evening') // 20:00 PKT
})

test('school day is the Pakistan date (UTC+5)', () => {
  assert.equal(todayPk(new Date('2026-10-11T20:30:00Z')), '2026-10-12') // 01:30 PKT next day
  assert.equal(monthStartPk(new Date('2026-10-31T20:30:00Z')), '2026-11-01')
})

test('"when" text is plain language in Pakistan time', () => {
  const now = new Date('2026-10-11T09:00:00Z')
  assert.equal(formatWhenPk('2026-10-11T08:48:00Z', now), '12 minutes ago')
  assert.match(formatWhenPk('2026-10-11T04:05:00Z', now), /^Today, 9:05 am$/)
  assert.match(formatWhenPk('2026-10-10T09:40:00Z', now), /^Yesterday, 2:40 pm$/)
})

test('menu is permission-driven and hides modules that are not built', () => {
  const labels = (role) => buildNav(role).flatMap((g) => g.items.map((i) => i.label))
  assert.deepEqual(labels('principal'), ['Dashboard', 'School settings'])
  assert.deepEqual(labels('teacher'), ['Dashboard'])
  assert.deepEqual(labels('parent'), ['Dashboard'])
  assert.deepEqual(labels('superadmin'), ['Dashboard', 'Waitlist'])
  for (const role of ['principal', 'teacher', 'accountant', 'superadmin']) {
    for (const g of buildNav(role)) for (const i of g.items) assert.ok(isBuilt(i.href), `${i.href} must be built`)
  }
  assert.equal(isBuilt('/school/students'), false)
})

test('logo geometry: exact brand colours, one grid, 8-unit gaps, slots inside the pillar', () => {
  assert.deepEqual(COLORS, { espresso: '#2C1810', terracotta: '#C4622D', cream: '#F5F0E8' })
  assert.equal(markFor(16), SIMPLE)
  assert.equal(markFor(32), SIMPLE)
  assert.equal(markFor(48), FULL)
  assert.equal(markFor(64, true), SIMPLE)
  // full mark: bars 10 wide, gap 8 -> x = 0,18,36; diagonal starts at 54; pillar at 110, width 48
  assert.match(FULL.parts[0].d, /^M0 0h10v152H0zM18 0h10v152H18zM36 0h10v152H36z$/)
  assert.equal(FULL.pillar, 'M110 0h48v152h-48z')
  assert.deepEqual(FULL.slots, ['M120 32h10v62h-10z', 'M138 32h10v62h-10z']) // margins 10, gap 8, margin 10
  // simplified mark uses whole numbers only (crisp at 16/32px)
  for (const d of [...SIMPLE.parts.map((p) => p.d), SIMPLE.pillar, ...SIMPLE.slots]) assert.ok(!/\d\.\d/.test(d), d)
})
