// One error format for every /api/v1 route: { error: { code, message, fields? } }.
// Pure module (no Next imports) so unit tests and scripts can use it.
//
// Messages are written for school staff: plain English, no technical details, never any
// personal data, stack trace or database detail.

export const ERROR_STATUS = Object.freeze({
  bad_request: 400,
  unauthenticated: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  payload_too_large: 413,
  unsupported_media_type: 415,
  validation_failed: 422,
  rate_limited: 429,
  internal: 500,
})

const DEFAULT_MESSAGE = Object.freeze({
  bad_request: 'The request could not be read.',
  unauthenticated: 'Please sign in again.',
  forbidden: 'You do not have permission to do this.',
  not_found: 'Not found.',
  conflict: 'This conflicts with an existing record.',
  payload_too_large: 'The request is too large.',
  unsupported_media_type: 'Send the request as JSON.',
  validation_failed: 'Please check the highlighted fields.',
  rate_limited: 'Too many attempts. Please try again later.',
  internal: 'Something went wrong. Please try again.',
})

export class ApiError extends Error {
  /**
   * @param {keyof ERROR_STATUS} code
   * @param {string} [message] safe to show to the user
   * @param {{ fields?: Record<string,string>, headers?: Record<string,string> }} [extra]
   */
  constructor(code, message, { fields, headers } = {}) {
    if (!(code in ERROR_STATUS)) throw new TypeError(`Unknown API error code: ${code}`)
    super(message || DEFAULT_MESSAGE[code])
    this.name = 'ApiError'
    this.code = code
    this.status = ERROR_STATUS[code]
    this.fields = fields
    this.headers = headers
  }
}

export const badRequest = (message) => new ApiError('bad_request', message)
export const unauthenticated = (message) => new ApiError('unauthenticated', message)
export const forbidden = (message) => new ApiError('forbidden', message)
export const notFound = (message) => new ApiError('not_found', message)
export const conflict = (message) => new ApiError('conflict', message)
export const validationFailed = (fields, message) => new ApiError('validation_failed', message, { fields })
export const rateLimited = (retryAfterSeconds) =>
  new ApiError('rate_limited', undefined, retryAfterSeconds ? { headers: { 'Retry-After': String(retryAfterSeconds) } } : {})

// Our own Postgres functions raise these SQLSTATEs (RAISE EXCEPTION '...' USING ERRCODE = 'NZ409').
// Their message is written by us and shown to the user, so it must never contain personal data.
const CUSTOM_SQLSTATE = { NZ400: 'bad_request', NZ403: 'forbidden', NZ404: 'not_found', NZ409: 'conflict', NZ422: 'validation_failed' }

/**
 * Maps a Postgres / PostgREST error (from supabase-js or pg) to an ApiError, or returns null when
 * it is not an expected case (the caller then treats it as a 500).
 * The database's own message/detail is NEVER passed through: it can contain values
 * (e.g. `Key (email)=(someone@x.com) already exists`).
 */
export function dbErrorToApiError(error) {
  const code = error?.code
  if (!code) return null
  if (CUSTOM_SQLSTATE[code]) return new ApiError(CUSTOM_SQLSTATE[code], String(error.message || '').slice(0, 200) || undefined)
  switch (code) {
    case '23505':
      return conflict('This record already exists.')
    case '23503':
      return new ApiError('validation_failed', 'A linked record does not exist.')
    case '23514':
    case '23502':
    case '22P02':
    case '22001':
    case '22003':
    case '22007':
    case '22008':
      return new ApiError('validation_failed', 'Some values are not allowed.')
    case '42501': // insufficient privilege / row-level security refused the row
      return forbidden()
    case 'PGRST116': // .single() found no row (RLS hides other schools' rows, so it looks like "not found")
      return notFound()
    default:
      return null
  }
}

/**
 * Turns any thrown value into { status, body, headers, expected }.
 * `expected` is false for anything that is not an ApiError (or a known DB case): the caller reports
 * those to error monitoring and the user only sees the generic 500 message.
 */
export function toErrorResponse(err) {
  const apiErr = err instanceof ApiError ? err : dbErrorToApiError(err)
  if (!apiErr) {
    return {
      status: 500,
      body: { error: { code: 'internal', message: DEFAULT_MESSAGE.internal } },
      headers: {},
      expected: false,
    }
  }
  const body = { error: { code: apiErr.code, message: apiErr.message } }
  if (apiErr.fields && Object.keys(apiErr.fields).length) body.error.fields = apiErr.fields
  return { status: apiErr.status, body, headers: apiErr.headers || {}, expected: true }
}
