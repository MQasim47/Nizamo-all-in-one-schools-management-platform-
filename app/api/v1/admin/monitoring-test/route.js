import { api } from '@/lib/api/handler'
import { requireAuth, requireSuperadmin } from '@/lib/api/auth'

// Super admin only: throws on purpose so you can confirm error monitoring works end to end.
// The event in Sentry must show this message and NO personal data (the fake email and phone below
// must arrive as [email] and [phone]). The caller gets the generic 500 envelope.
export const GET = api(async (request) => {
  requireSuperadmin(await requireAuth(request))
  throw new Error('Monitoring test from /api/v1/admin/monitoring-test (scrub check: test@example.com 0300 1234567)')
})
