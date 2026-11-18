import 'server-only'
import { dbErrorToApiError } from './errors.mjs'

// Postgres store for withIdempotency(), on the `idempotency_keys` table (migration 005).
// Uses the caller's own RLS client (ctx from getSchoolClient), so a user can only see and replay
// their own keys in their own school. Rows expire after 24 hours; a user's expired rows are
// removed on their next claim.
const STALE_IN_PROGRESS_MS = 2 * 60 * 1000

function fail(error) {
  throw dbErrorToApiError(error) || new Error(`idempotency store error ${error.code || ''}`.trim())
}

export function postgresIdempotencyStore(ctx) {
  const table = () => ctx.db.from('idempotency_keys')
  const mine = (q, scope, key) => q.eq('school_id', ctx.schoolId).eq('user_id', ctx.userId).eq('scope', scope).eq('key', key)

  async function insert(scope, key, requestHash) {
    return table().insert({ school_id: ctx.schoolId, user_id: ctx.userId, scope, key, request_hash: requestHash })
  }

  return {
    async claim({ scope, key, requestHash }) {
      await table().delete().eq('school_id', ctx.schoolId).eq('user_id', ctx.userId).lt('expires_at', new Date().toISOString())

      let { error } = await insert(scope, key, requestHash)
      if (!error) return { status: 'claimed' }
      if (error.code !== '23505') fail(error)

      const { data: record, error: readErr } = await mine(
        table().select('request_hash, state, response_status, response_body, created_at'),
        scope,
        key
      ).single()
      if (readErr) fail(readErr)

      // A request that crashed mid-way leaves an in-progress row; let a retry take over after 2 min.
      if (record.state === 'in_progress' && Date.now() - new Date(record.created_at).getTime() > STALE_IN_PROGRESS_MS) {
        await mine(table().delete(), scope, key).eq('state', 'in_progress')
        ;({ error } = await insert(scope, key, requestHash))
        if (!error) return { status: 'claimed' }
        if (error.code !== '23505') fail(error)
      }
      return { status: 'existing', record }
    },

    async complete({ scope, key, status, body }) {
      const { error } = await mine(table().update({ state: 'completed', response_status: status, response_body: body ?? null }), scope, key)
      if (error) fail(error)
    },

    async release({ scope, key }) {
      const { error } = await mine(table().delete(), scope, key)
      if (error) fail(error)
    },
  }
}
