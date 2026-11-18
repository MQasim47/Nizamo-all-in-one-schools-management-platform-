import 'server-only'
import { NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { toErrorResponse } from './errors.mjs'

// Wraps an /api/v1 route handler: whatever it throws becomes the standard error envelope
// { error: { code, message, fields? } }. Unexpected errors are reported to Sentry (scrubbed of
// personal data, see lib/monitoring/scrub.mjs) and the client only sees a generic 500.
//
//   export const POST = api(async (request) => {
//     const auth = requirePermission(await requireAuth(request), 'students.write')
//     const input = await parseBody(request, createStudentSchema)
//     return created(await createStudent(await getSchoolClient(auth), input))
//   })
export function api(handler) {
  return async function apiRoute(request, context) {
    try {
      const result = await handler(request, context)
      if (result instanceof Response) return withNoStore(result)
      return json(result ?? { ok: true })
    } catch (err) {
      const { status, body, headers, expected } = toErrorResponse(err)
      if (!expected) Sentry.captureException(err)
      return withNoStore(NextResponse.json(body, { status, headers }))
    }
  }
}

function withNoStore(res) {
  if (!res.headers.has('cache-control')) res.headers.set('cache-control', 'no-store')
  return res
}

export const json = (data, status = 200, headers) => withNoStore(NextResponse.json(data, { status, headers }))
export const ok = (data) => json(data, 200)
export const created = (data) => json(data, 201)
export const noContent = () => withNoStore(new NextResponse(null, { status: 204 }))

/** Response for an idempotent create: replays carry `Idempotent-Replayed: true`. */
export const idempotentResponse = ({ status, body, replayed }) =>
  json(body, status, replayed ? { 'Idempotent-Replayed': 'true' } : undefined)
