// Cursor (keyset) pagination for list endpoints: ?cursor=&limit=
// Lists order by a stable key (e.g. created_at DESC, id DESC); the cursor is the last row's key,
// opaque to the client. Response shape: { items, nextCursor } (nextCursor null on the last page).
import { z } from 'zod'
import { badRequest } from './errors.mjs'

export const MAX_LIMIT = 100

export const pageQuerySchema = z.object({
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(25),
})

export function encodeCursor(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url')
}

/** Returns the decoded cursor object, null when absent; 400 when it was tampered with. */
export function decodeCursor(cursor) {
  if (!cursor) return null
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('shape')
    return value
  } catch {
    throw badRequest('The page cursor is not valid.')
  }
}

/**
 * Query `limit + 1` rows, then pass them here.
 * @param {Array} rows rows fetched with limit + 1
 * @param {number} limit
 * @param {(row) => object} keyOf builds the cursor from the last row returned
 */
export function toPage(rows, limit, keyOf) {
  const hasMore = rows.length > limit
  const items = hasMore ? rows.slice(0, limit) : rows
  return { items, nextCursor: hasMore ? encodeCursor(keyOf(items[items.length - 1])) : null }
}
