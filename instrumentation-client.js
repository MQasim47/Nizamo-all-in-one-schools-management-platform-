import * as Sentry from '@sentry/nextjs'
import { SENTRY_DSN, sentryOptions } from '@/lib/monitoring/sentry-options.mjs'

// Browser error monitoring. Off without NEXT_PUBLIC_SENTRY_DSN. No session replay (privacy):
// only errors, scrubbed by lib/monitoring/scrub.mjs before they leave the browser.
if (SENTRY_DSN) Sentry.init(sentryOptions())

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
