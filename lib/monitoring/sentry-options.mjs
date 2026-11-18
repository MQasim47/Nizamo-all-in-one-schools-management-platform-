import { scrubBreadcrumb, scrubEvent } from './scrub.mjs'

// Shared Sentry settings for server, edge and browser. Monitoring is OFF unless
// NEXT_PUBLIC_SENTRY_DSN is set (empty in local dev and CI).
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || ''

export function sentryOptions() {
  const rate = Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE || 0)
  return {
    dsn: SENTRY_DSN,
    enabled: Boolean(SENTRY_DSN),
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    // Privacy: never let the SDK attach IPs, cookies, headers or user details on its own.
    sendDefaultPii: false,
    // Performance tracing off by default (free tier quota; can be raised later, e.g. 0.05).
    tracesSampleRate: Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : 0,
    maxBreadcrumbs: 30,
    beforeSend: scrubEvent,
    beforeSendTransaction: scrubEvent,
    beforeBreadcrumb: scrubBreadcrumb,
  }
}
