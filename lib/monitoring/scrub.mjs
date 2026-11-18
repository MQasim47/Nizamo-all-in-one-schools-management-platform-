// Removes personal data from Sentry events BEFORE they leave our servers or the browser.
// Pure module, unit-tested in tests/scrub.test.mjs. Rules:
//   - no user identity (no id, email, IP), no cookies, no request bodies, no query strings;
//   - only a short list of harmless headers;
//   - emails, phone numbers, CNIC/B-Form numbers, tokens and database row values are replaced in
//     every free-text string (error messages, breadcrumbs, extra data);
//   - any key that looks personal (name, phone, cnic, address, password, ...) is filtered entirely;
//   - stack frame local variables are dropped.

const FILTERED = '[Filtered]'

const SENSITIVE_KEY =
  /pass(word)?|secret|token|auth|cookie|session|csrf|email|e_mail|phone|mobile|whatsapp|contact|cnic|b_?form|nic|name|father|mother|guardian|address|dob|birth|body|payload|ip_?address|signature/i

const SAFE_HEADERS = new Set(['user-agent', 'content-type', 'accept', 'content-length'])

// SDK-provided contexts that carry only technical data (their "name" keys are e.g. "Chrome").
const SAFE_CONTEXTS = new Set(['os', 'browser', 'runtime', 'device', 'app', 'trace', 'culture', 'cloud_resource', 'react', 'nextjs'])

const PATTERNS = [
  [/eyJ[\w-]{5,}\.[\w-]{5,}\.[\w-]{5,}/g, '[token]'], // JWTs
  [/\b(bearer)\s+[\w.~+/-]+=*/gi, '$1 [token]'],
  [/[^\s@<>"'(),;:[\]]+@[^\s@<>"'(),;:[\]]+\.[a-z]{2,}/gi, '[email]'],
  [/\b\d{5}-?\d{7}-?\d\b/g, '[cnic]'], // CNIC / B-Form: 42101-1234567-3 or 13 digits
  [/(?:\+|\b00)?\b92[\s-]?3\d{2}[\s-]?\d{7}\b|\b03\d{2}[\s-]?\d{7}\b/g, '[phone]'],
  [/\b\d{10,}\b/g, '[number]'], // any other long digit run (account / phone numbers)
  [/\)=\([^)]*\)/g, ')=([Filtered])'], // Postgres detail: Key (email)=(someone@x.com) already exists
]

export function scrubText(value) {
  if (typeof value !== 'string') return value
  let out = value
  for (const [re, rep] of PATTERNS) out = out.replace(re, rep)
  return out
}

/** Strips the query string and fragment from a URL or path. */
export function stripQuery(url) {
  if (typeof url !== 'string') return url
  return url.split(/[?#]/)[0]
}

/** Deep-scrubs an object: personal-looking keys are filtered, strings are pattern-scrubbed. */
export function scrubDeep(value, depth = 0) {
  if (depth > 6) return FILTERED
  if (typeof value === 'string') return scrubText(value)
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => scrubDeep(v, depth + 1))
  if (value && typeof value === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(value)) out[k] = SENSITIVE_KEY.test(k) ? FILTERED : scrubDeep(v, depth + 1)
    return out
  }
  return value
}

function scrubRequest(req) {
  if (!req) return req
  const headers = {}
  for (const [k, v] of Object.entries(req.headers || {})) if (SAFE_HEADERS.has(k.toLowerCase())) headers[k] = v
  return { method: req.method, url: stripQuery(req.url), headers }
}

function scrubException(exception) {
  if (!exception?.values) return exception
  return {
    ...exception,
    values: exception.values.map((ex) => ({
      ...ex,
      value: scrubText(ex.value),
      stacktrace: ex.stacktrace && {
        ...ex.stacktrace,
        // Local variables are dropped; the source-code lines shown around a frame are scrubbed too.
        frames: (ex.stacktrace.frames || []).map(({ vars: _vars, ...frame }) => ({
          ...frame,
          context_line: scrubText(frame.context_line),
          pre_context: frame.pre_context?.map(scrubText),
          post_context: frame.post_context?.map(scrubText),
        })),
      },
    })),
  }
}

export function scrubBreadcrumb(crumb) {
  if (!crumb) return crumb
  // Console output can contain anything; keep only that something was logged, and its level.
  if (crumb.category === 'console') return { ...crumb, message: '[console]', data: undefined }
  const data = crumb.data ? { ...crumb.data } : undefined
  if (data) {
    for (const k of ['url', 'to', 'from']) if (typeof data[k] === 'string') data[k] = stripQuery(data[k])
    for (const k of Object.keys(data)) if (!['url', 'to', 'from', 'method', 'status_code'].includes(k)) delete data[k]
  }
  return { ...crumb, message: scrubText(crumb.message), data }
}

function scrubContexts(contexts) {
  if (!contexts) return contexts
  const out = {}
  for (const [k, v] of Object.entries(contexts)) out[k] = SAFE_CONTEXTS.has(k) ? v : scrubDeep(v)
  return out
}

/** Sentry beforeSend / beforeSendTransaction: returns a scrubbed copy of the event. */
export function scrubEvent(event) {
  if (!event) return event
  const out = { ...event }
  delete out.user
  delete out.server_name // machine name, not useful and may identify a developer's laptop
  if (out.request) out.request = scrubRequest(out.request)
  if (out.message) out.message = scrubText(out.message)
  if (out.logentry) out.logentry = { ...out.logentry, message: scrubText(out.logentry.message), params: undefined }
  if (out.exception) out.exception = scrubException(out.exception)
  if (out.breadcrumbs) out.breadcrumbs = out.breadcrumbs.map(scrubBreadcrumb)
  if (out.extra) out.extra = scrubDeep(out.extra)
  if (out.contexts) out.contexts = scrubContexts(out.contexts)
  if (out.tags) out.tags = scrubDeep(out.tags)
  if (typeof out.transaction === 'string') out.transaction = scrubText(stripQuery(out.transaction))
  return out
}
