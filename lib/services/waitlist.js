import 'server-only'
import { addWaitlistEntry } from '@/lib/db/admin/waitlist'

// Waitlist service (reference example of the service layer; see docs/API-PATTERN.md).
// Public: there is no school or signed-in user, so this is one of the few services that uses the
// server-only admin client (through lib/db/admin/*) instead of a ctx from getSchoolClient().
// Input arrives already validated by waitlistSchema.

/**
 * Adds a school to the waitlist. Returns { ok: true, duplicate } (duplicate = this WhatsApp number
 * is already on the list; the form shows a friendly message, not an error).
 */
export async function joinWaitlist(input) {
  // Honeypot: real people never fill `website`. Pretend it worked so bots learn nothing.
  if (input.website && input.website.trim() !== '') return { ok: true, duplicate: false }

  const { duplicate } = await addWaitlistEntry(input)
  return { ok: true, duplicate }
}
