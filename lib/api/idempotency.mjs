// Idempotency for create endpoints (payments, challans, imports, messages): a double click or a
// mobile retry with the same Idempotency-Key never creates a second record.
//
// Pure core: works with any store that implements claim / complete / release (see
// lib/api/idempotency-store.js for the Postgres one; tests use an in-memory store).
//
// For MONEY writes this is the second line of defence. The first is in the database: pass the
// key into the RPC and keep a unique constraint on the business table (see docs/API-PATTERN.md).
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { ApiError, badRequest, conflict } from './errors.mjs'

export const IDEMPOTENCY_HEADER = 'idempotency-key'
export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{8,128}$/)

/** Reads and validates the Idempotency-Key header. Missing or malformed -> 400. */
export function readIdempotencyKey(request) {
  const raw = request.headers.get(IDEMPOTENCY_HEADER)
  if (!raw) throw badRequest('An Idempotency-Key header is required for this request.')
  const parsed = idempotencyKeySchema.safeParse(raw.trim())
  if (!parsed.success) throw badRequest('The Idempotency-Key must be 8-128 letters, digits, "-" or "_".')
  return parsed.data
}

/** Stable JSON (sorted keys) so the same input always gives the same hash. */
export function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  return `{${Object.keys(value)
    .filter((k) => value[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
    .join(',')}}`
}

export function hashRequest(input) {
  return createHash('sha256').update(stableStringify(input)).digest('hex')
}

/**
 * Runs `fn` at most once per (scope, key).
 * @param {{ store, scope: string, key: string, input: unknown }} opts
 * @param {() => Promise<{ status: number, body: unknown }>} fn
 * @returns {Promise<{ status: number, body: unknown, replayed: boolean }>}
 */
export async function withIdempotency({ store, scope, key, input }, fn) {
  const requestHash = hashRequest(input)
  const claim = await store.claim({ scope, key, requestHash })

  if (claim.status === 'existing') {
    const rec = claim.record
    if (rec.request_hash !== requestHash) {
      throw new ApiError('validation_failed', 'This Idempotency-Key was already used for a different request.')
    }
    if (rec.state !== 'completed') throw conflict('This request is still being processed. Please wait a moment.')
    return { status: rec.response_status, body: rec.response_body, replayed: true }
  }

  let result
  try {
    result = await fn()
  } catch (err) {
    // Nothing was saved, so the client may retry with the same key.
    await store.release({ scope, key }).catch(() => {})
    throw err
  }
  await store.complete({ scope, key, status: result.status, body: result.body })
  return { ...result, replayed: false }
}

/** In-memory store for unit tests. */
export function memoryStore() {
  const rows = new Map()
  const id = (scope, key) => `${scope}\u0000${key}`
  return {
    rows,
    async claim({ scope, key, requestHash }) {
      const existing = rows.get(id(scope, key))
      if (existing) return { status: 'existing', record: existing }
      rows.set(id(scope, key), { request_hash: requestHash, state: 'in_progress' })
      return { status: 'claimed' }
    },
    async complete({ scope, key, status, body }) {
      Object.assign(rows.get(id(scope, key)), { state: 'completed', response_status: status, response_body: body })
    },
    async release({ scope, key }) {
      rows.delete(id(scope, key))
    },
  }
}
