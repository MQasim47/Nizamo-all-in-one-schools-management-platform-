// Sentry PII scrubbing: nothing personal may leave our servers or the browser.
import test from 'node:test'
import assert from 'node:assert/strict'
import { scrubBreadcrumb, scrubDeep, scrubEvent, scrubText, stripQuery } from '../lib/monitoring/scrub.mjs'

test('scrubText replaces personal data in free text', () => {
  for (const [input, mustNotContain, mustContain] of [
    ['user principal@ghs.com failed', 'principal@ghs.com', '[email]'],
    ['CNIC 42101-1234567-3 invalid', '42101-1234567-3', '[cnic]'],
    ['b-form 4210112345673', '4210112345673', '[cnic]'],
    ['call 0300 1234567 now', '0300 1234567', '[phone]'],
    ['call 03001234567', '03001234567', '[phone]'],
    ['whatsapp +923001234567', '923001234567', '[phone]'],
    ['whatsapp +92 300-1234567', '300-1234567', '[phone]'],
    ['account 12345678901234', '12345678901234', '[number]'],
    ['Key (email)=(ali@x.pk) already exists.', 'ali@x.pk', '[Filtered]'],
    ['Key (b_form_number)=(4210112345673) exists', '4210112345673', '[Filtered]'],
    ['token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abcdefghijk', 'eyJhbGciOiJIUzI1NiJ9', '[token]'],
    ['Authorization: Bearer abc123.def', 'abc123', '[token]'],
  ]) {
    const out = scrubText(input)
    assert.ok(!out.includes(mustNotContain), `${input} -> ${out}`)
    assert.ok(out.includes(mustContain), `${input} -> ${out}`)
  }
  assert.equal(scrubText('Database error 23505 in students'), 'Database error 23505 in students')
  assert.equal(scrubText('GR 1001, class 9A, 2026-11-18'), 'GR 1001, class 9A, 2026-11-18')
  assert.equal(scrubText(undefined), undefined)
})

test('stripQuery removes query strings and fragments', () => {
  assert.equal(stripQuery('https://ghs.getnizamo.com/school/students?q=Ali+Khan#top'), 'https://ghs.getnizamo.com/school/students')
  assert.equal(stripQuery('/api/v1/students?cnic=42101'), '/api/v1/students')
})

test('scrubDeep filters personal keys at any depth', () => {
  const out = scrubDeep({ student: { name: 'Ali', father_name: 'Khan', gr_number: '1001', b_form_number: '4210112345673' }, count: 3, note: 'mail me@x.com' })
  assert.deepEqual(out, {
    student: { name: '[Filtered]', father_name: '[Filtered]', gr_number: '1001', b_form_number: '[Filtered]' },
    count: 3,
    note: 'mail [email]',
  })
  for (const k of ['password', 'phone', 'whatsapp', 'email', 'cnic', 'guardian', 'home_address', 'contact', 'date_of_birth', 'cookie', 'access_token', 'body'])
    assert.equal(scrubDeep({ [k]: 'x' })[k], '[Filtered]', k)
})

test('scrubEvent: a realistic server event leaves with no personal data', () => {
  const event = {
    message: 'Failed for principal@ghs.com',
    user: { id: 'u1', email: 'principal@ghs.com', ip_address: '1.2.3.4', username: 'Principal' },
    server_name: 'QASIM-LAPTOP',
    request: {
      method: 'POST',
      url: 'https://ghs.getnizamo.com/api/v1/students?name=Ali',
      query_string: 'name=Ali',
      cookies: { 'next-auth.session-token': 'secret' },
      data: { name: 'Ali Khan', b_form_number: '4210112345673' },
      headers: { cookie: 'next-auth.session-token=secret', authorization: 'Bearer x', 'user-agent': 'Chrome', 'x-forwarded-for': '1.2.3.4', 'content-type': 'application/json' },
    },
    exception: { values: [{ type: 'Error', value: 'insert failed: Key (contact)=(03001234567)', stacktrace: { frames: [{ filename: 'app/route.js', lineno: 4, vars: { body: { name: 'Ali' } }, context_line: "throw new Error('x principal@ghs.com')", pre_context: ['// 03001234567'], post_context: ['}'] }] } }] },
    breadcrumbs: [
      { category: 'console', message: 'student Ali Khan 03001234567' },
      { category: 'fetch', message: 'POST', data: { url: '/api/v1/students?q=Ali', method: 'POST', status_code: 500, request_body: '{"name":"Ali"}' } },
    ],
    extra: { input: { name: 'Ali' }, attempt: 2 },
    contexts: { os: { name: 'Windows' }, student: { name: 'Ali' } },
    tags: { route: '/api/v1/students', email: 'x@y.com' },
    transaction: 'POST /api/v1/students?name=Ali',
  }
  const out = scrubEvent(event)
  const s = JSON.stringify(out)
  for (const leak of ['principal@ghs.com', '1.2.3.4', 'secret', 'Ali', '4210112345673', '03001234567', 'QASIM-LAPTOP', 'x@y.com', 'name=Ali', 'request_body'])
    assert.ok(!s.includes(leak), `leaked: ${leak}`)
  assert.equal(out.user, undefined)
  assert.deepEqual(out.request, { method: 'POST', url: 'https://ghs.getnizamo.com/api/v1/students', headers: { 'user-agent': 'Chrome', 'content-type': 'application/json' } })
  assert.equal(out.exception.values[0].stacktrace.frames[0].filename, 'app/route.js')
  assert.equal(out.exception.values[0].stacktrace.frames[0].vars, undefined)
  assert.equal(out.contexts.os.name, 'Windows')
  assert.equal(out.extra.attempt, 2)
  assert.equal(out.tags.route, '/api/v1/students')
  assert.equal(event.user.email, 'principal@ghs.com', 'the original event object is not mutated')
})

test('scrubBreadcrumb: console messages dropped, URLs stripped', () => {
  assert.equal(scrubBreadcrumb({ category: 'console', message: 'Ali 0300 1234567' }).message, '[console]')
  const nav = scrubBreadcrumb({ category: 'navigation', data: { from: '/school/students?q=Ali', to: '/school/students/1?tab=fees' } })
  assert.deepEqual(nav.data, { from: '/school/students', to: '/school/students/1' })
  assert.equal(scrubEvent(null), null)
})
