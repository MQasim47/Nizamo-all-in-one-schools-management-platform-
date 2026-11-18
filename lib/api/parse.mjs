// Input parsing for /api/v1 routes. Pure module (zod only) so it is unit-tested directly.
//   - malformed request (not JSON, too big, unreadable)  -> 400 / 413 / 415
//   - well-formed but invalid values                     -> 422 with { fields }
import { ApiError, badRequest, validationFailed } from './errors.mjs'

export const DEFAULT_MAX_BYTES = 16 * 1024

/** zod error -> { fieldPath: firstMessage }. Unknown keys (from .strict()) are reported per key. */
export function zodFields(zodError) {
  const fields = {}
  for (const issue of zodError.issues) {
    if (issue.code === 'unrecognized_keys') {
      for (const key of issue.keys) {
        const path = [...issue.path, key].join('.')
        fields[path] ??= 'This field is not allowed.'
      }
      continue
    }
    const path = issue.path.length ? issue.path.join('.') : '_form'
    fields[path] ??= issue.message
  }
  return fields
}

/** Validates an already-parsed value. Throws 422 with field messages. */
export function parseWith(schema, value) {
  const result = schema.safeParse(value)
  if (!result.success) throw validationFailed(zodFields(result.error))
  return result.data
}

/**
 * Reads a JSON request body and validates it with `schema` (use `.strict()` object schemas so
 * unknown keys are rejected, never passed on).
 */
export async function parseBody(request, schema, { maxBytes = DEFAULT_MAX_BYTES } = {}) {
  const type = request.headers.get('content-type') || ''
  if (!type.toLowerCase().includes('application/json')) throw new ApiError('unsupported_media_type')
  if (Number(request.headers.get('content-length') || 0) > maxBytes) throw new ApiError('payload_too_large')

  let text
  try {
    text = await request.text()
  } catch {
    throw badRequest()
  }
  if (text.length > maxBytes) throw new ApiError('payload_too_large')

  let value
  try {
    value = JSON.parse(text)
  } catch {
    throw badRequest('The request body is not valid JSON.')
  }
  return parseWith(schema, value)
}

/** Validates the URL query string (all values arrive as strings: use z.coerce for numbers). */
export function parseQuery(request, schema) {
  const url = new URL(request.url)
  const raw = {}
  for (const [k, v] of url.searchParams) raw[k] = v
  return parseWith(schema, raw)
}
