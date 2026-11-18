// Unit tests for the /api/v1 building blocks (lib/api/*): error envelope, input parsing,
// pagination, idempotency, database error mapping.
import test from 'node:test'
import assert from 'node:assert/strict'
import { z } from 'zod'
import { ApiError, ERROR_STATUS, dbErrorToApiError, toErrorResponse, validationFailed, rateLimited } from '../lib/api/errors.mjs'
import { parseBody, parseQuery, zodFields } from '../lib/api/parse.mjs'
import { decodeCursor, encodeCursor, pageQuerySchema, toPage } from '../lib/api/pagination.mjs'
import { hashRequest, memoryStore, readIdempotencyKey, stableStringify, withIdempotency } from '../lib/api/idempotency.mjs'
import { callRpc, dbError, unwrap } from '../lib/api/db.mjs'

const req = (body, headers = { 'content-type': 'application/json' }, url = 'http://x.test/api/v1/thing') =>
  new Request(url, { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) })
const thrown = async (fn) => {
  try {
    await fn()
  } catch (e) {
    return e
  }
  assert.fail('expected a throw')
}

test('error codes map to the agreed HTTP statuses', () => {
  for (const [code, status] of [
    ['bad_request', 400], ['unauthenticated', 401], ['forbidden', 403], ['not_found', 404],
    ['conflict', 409], ['validation_failed', 422], ['rate_limited', 429], ['internal', 500],
  ]) {
    assert.equal(ERROR_STATUS[code], status)
    if (code !== 'internal') assert.equal(new ApiError(code).status, status)
  }
  assert.throws(() => new ApiError('teapot'), TypeError)
})

test('envelope: ApiError -> { error: { code, message, fields? } }', () => {
  const r = toErrorResponse(validationFailed({ name: 'Required' }))
  assert.equal(r.status, 422)
  assert.equal(r.expected, true)
  assert.deepEqual(r.body, { error: { code: 'validation_failed', message: 'Please check the highlighted fields.', fields: { name: 'Required' } } })
  assert.deepEqual(toErrorResponse(new ApiError('forbidden')).body, { error: { code: 'forbidden', message: 'You do not have permission to do this.' } })
  assert.equal(toErrorResponse(rateLimited(60)).headers['Retry-After'], '60')
})

test('envelope: unexpected errors become a generic 500 with no detail', () => {
  const err = new Error('connect ECONNREFUSED 10.0.0.1 for principal@ghs.com')
  err.stack = 'Error: boom\n    at handler (/app/route.js:10:5)'
  const r = toErrorResponse(err)
  assert.equal(r.status, 500)
  assert.equal(r.expected, false)
  assert.deepEqual(r.body, { error: { code: 'internal', message: 'Something went wrong. Please try again.' } })
  assert.doesNotMatch(JSON.stringify(r.body), /ECONNREFUSED|ghs\.com|route\.js|at handler/)
})

test('database errors: known SQLSTATEs are mapped, values never leak', () => {
  const cases = [
    [{ code: '23505', message: 'duplicate key', details: 'Key (email)=(a@b.com) already exists.' }, 409, 'conflict'],
    [{ code: '23503' }, 422, 'validation_failed'],
    [{ code: '23514' }, 422, 'validation_failed'],
    [{ code: '22P02' }, 422, 'validation_failed'],
    [{ code: '42501', message: 'new row violates row-level security policy for table "students"' }, 403, 'forbidden'],
    [{ code: 'PGRST116' }, 404, 'not_found'],
    [{ code: 'NZ409', message: 'This challan is already paid.' }, 409, 'conflict'],
    [{ code: 'NZ404', message: 'Challan not found.' }, 404, 'not_found'],
    [{ code: 'NZ422', message: 'Amount exceeds the balance.' }, 422, 'validation_failed'],
  ]
  for (const [pgErr, status, code] of cases) {
    const r = toErrorResponse(pgErr)
    assert.equal(r.status, status, pgErr.code)
    assert.equal(r.body.error.code, code)
    assert.doesNotMatch(JSON.stringify(r.body), /a@b\.com|row-level|students/)
  }
  assert.equal(toErrorResponse({ code: 'NZ409', message: 'This challan is already paid.' }).body.error.message, 'This challan is already paid.')
  assert.equal(dbErrorToApiError({ code: '08006' }), null)
  assert.equal(dbErrorToApiError(null), null)
})

test('dbError / unwrap keep only the SQLSTATE for unexpected errors', () => {
  const e = dbError({ code: '08006', message: 'connection to 10.1.2.3 failed for user x@y.com' })
  assert.equal(e.message, 'Database error 08006')
  assert.equal(e.dbCode, '08006')
  assert.deepEqual(unwrap({ data: [1], error: null }), [1])
})

test('unwrap throws the mapped error', () => {
  assert.throws(() => unwrap({ data: null, error: { code: '23505' } }), (e) => e instanceof ApiError && e.status === 409)
})

test('callRpc calls ctx.db.rpc and maps errors; rejects odd function names', async () => {
  const calls = []
  const ctx = { db: { rpc: async (fn, args) => (calls.push([fn, args]), fn === 'bad' ? { data: null, error: { code: 'NZ409', message: 'Already paid.' } } : { data: { id: 1 }, error: null }) } }
  assert.deepEqual(await callRpc(ctx, 'record_payment', { p_amount: 5 }), { id: 1 })
  assert.deepEqual(calls[0], ['record_payment', { p_amount: 5 }])
  const e = await thrown(() => callRpc(ctx, 'bad'))
  assert.equal(e.status, 409)
  await assert.rejects(() => callRpc(ctx, 'drop table x; --'), /Invalid function name/)
})

test('parseBody: 415 not JSON, 413 too large, 400 malformed, 422 invalid with fields', async () => {
  const schema = z.object({ name: z.string().min(2, 'Too short'), age: z.number().int() }).strict()
  assert.equal((await thrown(() => parseBody(req('x', { 'content-type': 'text/plain' }), schema))).status, 415)
  assert.equal((await thrown(() => parseBody(req({ name: 'x'.repeat(200) }), schema, { maxBytes: 50 }))).status, 413)
  assert.equal((await thrown(() => parseBody(req('{bad json'), schema))).status, 400)
  const e = await thrown(() => parseBody(req({ name: 'a', age: 1.5, school_id: 'x' }), schema))
  assert.equal(e.status, 422)
  assert.deepEqual(e.fields, { name: 'Too short', age: e.fields.age, school_id: 'This field is not allowed.' })
  assert.equal(typeof e.fields.age, 'string')
  assert.deepEqual(await parseBody(req({ name: 'Ali', age: 9 }), schema), { name: 'Ali', age: 9 })
})

test('zodFields: nested paths and form-level errors', () => {
  const schema = z.object({ a: z.object({ b: z.string() }) }).refine(() => false, 'Whole form is wrong')
  const r = schema.safeParse({ a: { b: 1 } })
  assert.equal(typeof zodFields(r.error)['a.b'], 'string')
  const r2 = schema.safeParse({ a: { b: 'x' } })
  assert.equal(zodFields(r2.error)._form, 'Whole form is wrong')
})

test('parseQuery + pagination: limit defaults to 25, max 100, cursor round-trips', () => {
  const q = (s) => parseQuery(new Request(`http://x.test/api/v1/students${s}`), pageQuerySchema)
  assert.deepEqual(q(''), { limit: 25 })
  assert.equal(q('?limit=100').limit, 100)
  assert.throws(() => q('?limit=101'), (e) => e.status === 422)
  assert.throws(() => q('?limit=0'), (e) => e.status === 422)
  const c = encodeCursor({ created_at: '2026-11-18T10:00:00Z', id: 'abc' })
  assert.deepEqual(decodeCursor(c), { created_at: '2026-11-18T10:00:00Z', id: 'abc' })
  assert.equal(decodeCursor(undefined), null)
  assert.throws(() => decodeCursor('not-a-cursor!!'), (e) => e.status === 400)
  assert.throws(() => decodeCursor(Buffer.from('[1]').toString('base64url')), (e) => e.status === 400)
})

test('toPage: next cursor only when there is another page', () => {
  const rows = [{ id: 1 }, { id: 2 }, { id: 3 }]
  const p = toPage(rows, 2, (r) => ({ id: r.id }))
  assert.deepEqual(p.items, [{ id: 1 }, { id: 2 }])
  assert.deepEqual(decodeCursor(p.nextCursor), { id: 2 })
  assert.deepEqual(toPage(rows, 3, (r) => r), { items: rows, nextCursor: null })
  assert.deepEqual(toPage([], 25, (r) => r), { items: [], nextCursor: null })
})

test('Idempotency-Key header: required and well-formed', () => {
  const h = (v) => new Request('http://x.test', { headers: v === undefined ? {} : { 'idempotency-key': v } })
  assert.throws(() => readIdempotencyKey(h(undefined)), (e) => e.status === 400)
  assert.throws(() => readIdempotencyKey(h('short')), (e) => e.status === 400)
  assert.throws(() => readIdempotencyKey(h('has spaces in it')), (e) => e.status === 400)
  assert.equal(readIdempotencyKey(h('3f2a9c1e-7b4d-4e8a-9f00-1234567890ab')), '3f2a9c1e-7b4d-4e8a-9f00-1234567890ab')
})

test('request hash is stable regardless of key order', () => {
  assert.equal(stableStringify({ b: 1, a: [2, { d: 1, c: 2 }] }), '{"a":[2,{"c":2,"d":1}],"b":1}')
  assert.equal(hashRequest({ a: 1, b: 2 }), hashRequest({ b: 2, a: 1 }))
  assert.notEqual(hashRequest({ a: 1 }), hashRequest({ a: 2 }))
})

test('withIdempotency: first call runs, retry replays, no duplicate', async () => {
  const store = memoryStore()
  let runs = 0
  const create = async () => ({ status: 201, body: { id: ++runs } })
  const opts = { store, scope: 'fees.payment', key: 'key-12345678', input: { amount: 500 } }
  const first = await withIdempotency(opts, create)
  const again = await withIdempotency(opts, create)
  assert.deepEqual(first, { status: 201, body: { id: 1 }, replayed: false })
  assert.deepEqual(again, { status: 201, body: { id: 1 }, replayed: true })
  assert.equal(runs, 1)
})

test('withIdempotency: same key + different body -> 422; while running -> 409', async () => {
  const store = memoryStore()
  const opts = { store, scope: 'fees.payment', key: 'key-12345678', input: { amount: 500 } }
  await withIdempotency(opts, async () => ({ status: 201, body: {} }))
  const e = await thrown(() => withIdempotency({ ...opts, input: { amount: 900 } }, async () => ({ status: 201, body: {} })))
  assert.equal(e.status, 422)

  let release
  const slow = withIdempotency({ ...opts, key: 'key-slow-0001' }, () => new Promise((r) => (release = () => r({ status: 201, body: {} }))))
  const e2 = await thrown(() => withIdempotency({ ...opts, key: 'key-slow-0001' }, async () => ({ status: 201, body: {} })))
  assert.equal(e2.status, 409)
  release()
  await slow
})

test('withIdempotency: a failure releases the key so the client can retry', async () => {
  const store = memoryStore()
  const opts = { store, scope: 'import.students', key: 'key-retry-001', input: { rows: 3 } }
  await assert.rejects(() => withIdempotency(opts, async () => { throw new Error('db down') }), /db down/)
  assert.equal(store.rows.size, 0)
  const ok = await withIdempotency(opts, async () => ({ status: 201, body: { imported: 3 } }))
  assert.equal(ok.replayed, false)
})

test('scopes are independent: the same key in two scopes runs twice', async () => {
  const store = memoryStore()
  let runs = 0
  const fn = async () => ({ status: 201, body: { n: ++runs } })
  await withIdempotency({ store, scope: 'a', key: 'same-key-001', input: {} }, fn)
  await withIdempotency({ store, scope: 'b', key: 'same-key-001', input: {} }, fn)
  assert.equal(runs, 2)
})
