// Tiny in-memory sliding-window limiter, per server instance. Good enough to blunt abuse on a
// single node; on serverless/multi-instance deploys replace the store with Redis/Upstash.
const buckets = new Map()

export function isRateLimited(key, { limit, windowMs }) {
  const now = Date.now()
  const rec = buckets.get(key)
  if (!rec || now - rec.start > windowMs) {
    buckets.set(key, { start: now, n: 1 })
    if (buckets.size > 10000) buckets.clear()
    return false
  }
  rec.n += 1
  return rec.n > limit
}

export function clientIp(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
}
