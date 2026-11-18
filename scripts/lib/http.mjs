// Helpers for live API tests: sign in through NextAuth like a browser (cookie jar).
export const BASE = process.env.TEST_BASE || 'http://localhost:3101'

export function jar() {
  const store = {}
  return {
    absorb(res) {
      for (const c of res.headers.getSetCookie?.() || []) {
        const [kv] = c.split(';')
        const i = kv.indexOf('=')
        store[kv.slice(0, i)] = kv.slice(i + 1)
      }
    },
    header: () => Object.entries(store).map(([k, v]) => `${k}=${v}`).join('; '),
    has: (name) => Object.keys(store).some((k) => k.includes(name)),
  }
}

/** Returns a cookie jar holding a NextAuth session (check `.has('session-token')`). */
export async function signIn(email, password, subdomain) {
  const j = jar()
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`)
  j.absorb(csrfRes)
  const { csrfToken } = await csrfRes.json()
  const res = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: 'POST',
    redirect: 'manual',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: j.header() },
    body: new URLSearchParams({ csrfToken, email, password, subdomain, json: 'true' }),
  })
  j.absorb(res)
  return j
}

/** fetch with an optional cookie jar; `body` objects are sent as JSON, `raw` as-is. */
export function call(method, path, { as, body, raw, headers = {} } = {}) {
  return fetch(`${BASE}${path}`, {
    method,
    redirect: 'manual',
    headers: {
      ...(body !== undefined || raw !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(as ? { cookie: as.header() } : {}),
      ...headers,
    },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  })
}

/** Reads a JSON body without throwing. */
export const jsonOf = (res) => res.json().catch(() => ({}))

/** true when the response is the standard error envelope with this code and nothing else. */
export function isEnvelope(j, code) {
  return (
    Object.keys(j).join() === 'error' &&
    j.error?.code === code &&
    typeof j.error.message === 'string' &&
    !/\bat \S+ \(|\.m?js:\d|stack/i.test(JSON.stringify(j))
  )
}
