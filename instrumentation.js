import * as Sentry from '@sentry/nextjs'
import { SENTRY_DSN, sentryOptions } from '@/lib/monitoring/sentry-options.mjs'

// Server + edge error monitoring (Next.js instrumentation hook). Does nothing without a DSN.
export function register() {
  if (!SENTRY_DSN) return
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init(sentryOptions())
  }
}

// Errors thrown in server components, route handlers and the proxy. No-op when Sentry is off.
export const onRequestError = Sentry.captureRequestError
