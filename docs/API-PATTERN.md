# API + service pattern (every module follows this)

Reference implementations:

| What | Public example | Signed-in example |
|---|---|---|
| Route | [app/api/v1/waitlist/route.js](../app/api/v1/waitlist/route.js) | [app/api/v1/settings/route.js](../app/api/v1/settings/route.js) |
| Service | [lib/services/waitlist.js](../lib/services/waitlist.js) | [lib/services/settings.js](../lib/services/settings.js) |
| Validation | [lib/validation/waitlist.js](../lib/validation/waitlist.js) | [lib/validation/settings.mjs](../lib/validation/settings.mjs) |
| Live test | [scripts/test-waitlist.mjs](../scripts/test-waitlist.mjs) | [scripts/test-api.mjs](../scripts/test-api.mjs) |

## The rules

1. **Logic lives in `lib/services/<module>.js`.** A service takes the `ctx` from `getSchoolClient(auth)` as its first argument, validates its input with zod (again, even if the route already did), and returns plain data. Web pages call the service directly. The mobile app calls the route.
2. **Routes live in `app/api/v1/<module>/route.js`.** A route only does: auth → permission → parse → service → respond. No queries, no business rules, no `try/catch`.
3. **One error format**, produced by `api()` from [lib/api/handler.js](../lib/api/handler.js):
   ```json
   { "error": { "code": "validation_failed", "message": "Please check the highlighted fields.", "fields": { "hijri_offset": "Choose a number from -2 to +2." } } }
   ```
   Success responses are the data itself (`{ ... }`), or `{ items, nextCursor }` for lists.
4. **No personal data and no internals in responses or logs.** Unexpected errors become a generic 500 and go to Sentry (scrubbed). Database messages are never passed through (they contain row values).
5. **`school_id` always comes from the session** (`ctx.schoolId`), never from the body, URL or query. Body schemas are `.strict()`, so a `school_id` key is a 422.

### Status codes

| Status | `code` | When | Thrown by |
|---|---|---|---|
| 400 | `bad_request` | body is not valid JSON, bad cursor, missing `Idempotency-Key` | `parseBody`, `decodeCursor`, `readIdempotencyKey` |
| 401 | `unauthenticated` | signed out, deactivated user, suspended school, bearer token | `requireAuth` |
| 403 | `forbidden` | role lacks the permission; RLS refused a write (42501) | `requirePermission`, DB mapping |
| 404 | `not_found` | row missing **or belongs to another school** (RLS hides it, so the two look the same: never reveal which) | service, `PGRST116`, `NZ404` |
| 409 | `conflict` | unique violation (23505), request with that key still running, `NZ409` | DB mapping, `withIdempotency` |
| 413 / 415 | `payload_too_large` / `unsupported_media_type` | body too big / not JSON | `parseBody` |
| 422 | `validation_failed` | zod failed (`fields` per input), FK/check violation, key reused with a different body, `NZ422` | `parseBody`, `parseWith`, DB mapping |
| 429 | `rate_limited` | too many requests (`Retry-After` header) | `enforceRateLimit` |
| 500 | `internal` | anything unexpected (reported to Sentry) | `api()` |

## Helpers

| Helper | File | Use |
|---|---|---|
| `api(handler)`, `ok`, `created`, `noContent`, `idempotentResponse` | `lib/api/handler.js` | wrap every route; build responses |
| `requireAuth(request)` | `lib/api/auth.js` | web cookie today; `Authorization: Bearer` path designed (refused with 401 until Session 8 issues mobile tokens) |
| `requirePermission(auth, 'x.y')`, `requireSuperadmin(auth)` | `lib/api/auth.js` | 403 unless allowed (`lib/auth/permissions.mjs`) |
| `parseBody(request, schema, { maxBytes })`, `parseQuery`, `parseWith` | `lib/api/parse.mjs` | 400/413/415 for malformed, 422 with `fields` for invalid |
| `ApiError`, `notFound()`, `conflict()`, `forbidden()`, `validationFailed(fields)` | `lib/api/errors.mjs` | throw from services |
| `unwrap(result)`, `callRpc(ctx, fn, args)`, `dbError` | `lib/api/db.mjs` | turn supabase-js results/errors into data or mapped errors |
| `readIdempotencyKey`, `withIdempotency` | `lib/api/idempotency.mjs` + `lib/api/idempotency-store.js` | create endpoints that must not run twice |
| `pageQuerySchema`, `toPage`, `decodeCursor` | `lib/api/pagination.mjs` | `?cursor=&limit=` lists |
| `enforceRateLimit(request, name, { limit, windowMs })` | `lib/utils/rate-limit.js` | public endpoints |
| `formatRs`, `toRupees`, `sumRupees`; `rupeesSchema` | `lib/utils/money.mjs`; `lib/validation/money.mjs` | money is whole rupees (`bigint`), one formatter |
| `todayPk`, `toPkDate`, `addDaysPk`, `pkDayRange`, `isValidDate`; `pkDateSchema` | `lib/utils/dates.mjs`; `lib/validation/dates.mjs` | school dates are Pakistan dates (lint blocks `toISOString().split/slice`) |

## Copy-paste templates

### Validation — `lib/validation/<module>.mjs`

```js
import { z } from 'zod'
import { rupeesSchema } from './money.mjs'
import { pkDateSchema } from './dates.mjs'

export const createThingSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter at least 2 letters').max(120),
    amount: rupeesSchema,
    due_on: pkDateSchema,
  })
  .strict()
```

Keep validation files free of `@/` imports and React (`.mjs`), so unit tests and the mobile app can import them.

### Service — `lib/services/<module>.js`

```js
import 'server-only'
import { callRpc, unwrap } from '@/lib/api/db.mjs'
import { notFound } from '@/lib/api/errors.mjs'
import { parseWith } from '@/lib/api/parse.mjs'
import { decodeCursor, toPage } from '@/lib/api/pagination.mjs'
import { createThingSchema } from '@/lib/validation/things.mjs'

const COLUMNS = 'id, name, amount, due_on, created_at' // list columns, never select('*') on users

export async function listThings(ctx, { cursor, limit }) {
  const after = decodeCursor(cursor)
  let q = ctx.db.from('things').select(COLUMNS).eq('school_id', ctx.schoolId)
    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(limit + 1)
  if (after) q = q.or(`created_at.lt.${after.created_at},and(created_at.eq.${after.created_at},id.lt.${after.id})`)
  return toPage(unwrap(await q), limit, (r) => ({ created_at: r.created_at, id: r.id }))
}

export async function getThing(ctx, id) {
  const row = unwrap(await ctx.db.from('things').select(COLUMNS).eq('school_id', ctx.schoolId).eq('id', id).maybeSingle())
  if (!row) throw notFound() // also what another school's id looks like
  return row
}

export async function createThing(ctx, input) {
  const values = parseWith(createThingSchema, input)
  // One row: a plain insert. Several rows that must stay consistent: ONE Postgres function.
  return unwrap(await ctx.db.from('things').insert({ ...values, school_id: ctx.schoolId }).select(COLUMNS).single())
  // return callRpc(ctx, 'create_thing', { p_name: values.name, p_amount: values.amount })
}
```

### Route — `app/api/v1/things/route.js`

```js
import { api, created, idempotentResponse, ok } from '@/lib/api/handler'
import { requireAuth, requirePermission } from '@/lib/api/auth'
import { parseBody, parseQuery } from '@/lib/api/parse.mjs'
import { pageQuerySchema } from '@/lib/api/pagination.mjs'
import { readIdempotencyKey, withIdempotency } from '@/lib/api/idempotency.mjs'
import { postgresIdempotencyStore } from '@/lib/api/idempotency-store'
import { getSchoolClient } from '@/lib/supabase/school'
import { createThingSchema } from '@/lib/validation/things.mjs'
import { createThing, listThings } from '@/lib/services/things'

export const GET = api(async (request) => {
  const auth = requirePermission(await requireAuth(request), 'things.read')
  const page = parseQuery(request, pageQuerySchema)
  return ok(await listThings(await getSchoolClient(auth), page))
})

// Plain create:
export const POST = api(async (request) => {
  const auth = requirePermission(await requireAuth(request), 'things.write')
  const input = await parseBody(request, createThingSchema)
  return created(await createThing(await getSchoolClient(auth), input))
})

// Create that must never run twice (payments, challans, imports, messages): export THIS as POST
// instead of the plain one above (a route file has one POST).
export const POST = api(async (request) => {
  const auth = requirePermission(await requireAuth(request), 'fees.write')
  const key = readIdempotencyKey(request)
  const input = await parseBody(request, createThingSchema)
  const ctx = await getSchoolClient(auth)
  const result = await withIdempotency(
    { store: postgresIdempotencyStore(ctx), scope: 'things.create', key, input },
    async () => ({ status: 201, body: await createThing(ctx, input) })
  )
  return idempotentResponse(result)
})
```

`[id]` routes read the id from `(await context.params).id` and validate it with `parseWith(z.string().uuid(), id)`.

### Transactions — Postgres function in a migration

supabase-js cannot hold a transaction across calls. Anything that writes several rows that must stay consistent is one function, called with `callRpc`:

```sql
-- supabase/migrations/0NN_things.sql  (no BEGIN/COMMIT: the runner wraps the file)
CREATE FUNCTION public.record_payment(p_challan_id uuid, p_amount bigint, p_idempotency_key text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER              -- RLS applies to the caller. Never SECURITY DEFINER for school data.
SET search_path = public, pg_temp
AS $$
DECLARE v_id uuid;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be more than zero.' USING ERRCODE = 'NZ422';
  END IF;
  -- The idempotency key is ALSO a unique column on the money table: a retry can never double-pay,
  -- even if the API-level key row expired.
  INSERT INTO fee_payments (school_id, challan_id, amount_paid, idempotency_key)
  VALUES (app.school_id(), p_challan_id, p_amount, p_idempotency_key)
  ON CONFLICT (school_id, idempotency_key) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'This payment was already recorded.' USING ERRCODE = 'NZ409';
  END IF;
  UPDATE challans SET status = 'paid' WHERE school_id = app.school_id() AND id = p_challan_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challan not found.' USING ERRCODE = 'NZ404'; -- rolls back the insert too
  END IF;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.record_payment(uuid, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_payment(uuid, bigint, text) TO authenticated;
```

Our error codes `NZ400/403/404/409/422` map to the matching status. Their message is shown to the user, so write it yourself and **never put personal data in it**.

### New table checklist (in the same migration)

`school_id NOT NULL`, composite `(school_id, id)` foreign keys, `ENABLE ROW LEVEL SECURITY`, policies on `(SELECT app.school_id())` + `(SELECT app.can('x.y'))`, explicit `GRANT`s (column lists for writes), audit trigger for marks/fees/GR/roles/settings/attendance, and a new section in `scripts/test-tenant.mjs` (cross-school read + write denied). Apply with `npm run migrate`; never edit an applied migration.

## Test template (copy `scripts/test-api.mjs`)

Every `/api/v1` module gets a live test with at least these cases. Helpers are in [scripts/lib/http.mjs](../scripts/lib/http.mjs) (`signIn`, `call`, `jsonOf`, `isEnvelope`).

```js
import { call, isEnvelope, jsonOf, signIn } from './lib/http.mjs'
const PATH = '/api/v1/things'

// 401: signed out, and a bearer token (until mobile tokens exist)
let r = await call('GET', PATH)
check('signed out -> 401', r.status === 401 && isEnvelope(await jsonOf(r), 'unauthenticated'))
r = await call('GET', PATH, { headers: { authorization: 'Bearer x.y.z' } })
check('bearer -> 401', r.status === 401)

// 403: one check per role that must NOT have access
r = await call('POST', PATH, { as: teacher, body: valid })
check('teacher -> 403', r.status === 403 && isEnvelope(await jsonOf(r), 'forbidden'))

// 400 / 422: malformed vs invalid, one case per rule, plus a school_id smuggling attempt
r = await call('POST', PATH, { as: principal, raw: '{bad' })
check('malformed JSON -> 400', r.status === 400)
for (const [name, body, field] of [['name too short', { ...valid, name: 'a' }, 'name'], ['school_id is not accepted', { ...valid, school_id: otherSchoolId }, 'school_id']]) {
  r = await call('POST', PATH, { as: principal, body })
  const j = await jsonOf(r)
  check(`${name} -> 422`, r.status === 422 && isEnvelope(j, 'validation_failed') && !!j.error.fields?.[field])
}

// other school: seed a throwaway school B with the admin client, sign in as its principal
r = await call('GET', `${PATH}/${idOfARow}`, { as: principalB })
check("B cannot read A's row -> 404 (same as missing)", r.status === 404)
r = await call('PATCH', `${PATH}/${idOfARow}`, { as: principalB, body: { name: 'x' } })
check("B cannot change A's row -> 404, A unchanged", r.status === 404 /* + re-read A with the admin client */)

// happy path + audit row with old -> new (marks, fees, GR, roles, settings, attendance)
// idempotent creates: same key twice -> one row, second response has Idempotent-Replayed: true;
//                     same key, different body -> 422
// cleanup: delete the throwaway school in finally {}
```

Run it against `npm run dev -- -p 3101` and add it to `package.json` as `test:<module>`. Pure calculations (money, marks, dates) get table-driven unit tests in `tests/*.test.mjs` instead; those also run in CI.
