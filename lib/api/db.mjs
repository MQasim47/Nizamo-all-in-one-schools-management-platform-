// Database helpers for services. Pure (no Next imports): takes the ctx from getSchoolClient().
//
// TRANSACTIONS: supabase-js cannot hold a transaction across several calls. Anything that writes
// more than one row that must stay consistent (a payment + its challan status, an import, an
// approval batch) is ONE Postgres function in a migration, called with callRpc(). Write it
// SECURITY INVOKER (the default) so RLS still applies to the caller; see docs/API-PATTERN.md.
import { dbErrorToApiError } from './errors.mjs'

/** Converts a Postgres error to an ApiError, or a generic Error that carries only the SQLSTATE. */
export function dbError(error) {
  const mapped = dbErrorToApiError(error)
  if (mapped) return mapped
  // Never keep error.message/details: they can contain row values (personal data).
  const e = new Error(`Database error${error?.code ? ` ${error.code}` : ''}`)
  e.dbCode = error?.code
  return e
}

/** `const rows = unwrap(await ctx.db.from('x').select(...))` -> data, or throws a mapped error. */
export function unwrap({ data, error }) {
  if (error) throw dbError(error)
  return data
}

/** Calls a Postgres function (one transaction) as the signed-in user. */
export async function callRpc(ctx, fn, args = {}) {
  if (!/^[a-z_][a-z0-9_]*$/.test(fn)) throw new Error('Invalid function name')
  return unwrap(await ctx.db.rpc(fn, args))
}
