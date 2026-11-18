import { api, ok } from '@/lib/api/handler'
import { parseBody } from '@/lib/api/parse.mjs'
import { enforceRateLimit } from '@/lib/utils/rate-limit'
import { waitlistSchema } from '@/lib/validation/waitlist'
import { joinWaitlist } from '@/lib/services/waitlist'

// POST /api/v1/waitlist — public. Reference example of a PUBLIC /api/v1 route:
// rate limit -> parse -> service -> respond. Everything else lives in the service.
//   200 { ok: true, duplicate }   400 bad JSON   413 too large   415 not JSON
//   422 { error: { code: 'validation_failed', fields } }   429 rate limited
export const POST = api(async (request) => {
  enforceRateLimit(request, 'waitlist', { limit: 5, windowMs: 60 * 60 * 1000 })
  const input = await parseBody(request, waitlistSchema, { maxBytes: 4000 })
  return ok(await joinWaitlist(input))
})
