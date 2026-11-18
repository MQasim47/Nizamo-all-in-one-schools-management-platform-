import { z } from 'zod'

// zod schemas for money input: whole rupees only (no paisa). Kept apart from lib/utils/money.mjs
// so the formatter stays free of zod for client bundles.
const MAX_RUPEES = 10_000_000_000 // Rs. 10 arab: far above any school amount, well inside bigint.

/** A non-negative whole-rupee amount, e.g. a fee or a payment. Accepts 2500 or "2500". */
export const rupeesSchema = z.coerce
  .number({ error: 'Enter an amount in rupees' })
  .int('Enter whole rupees (no paisa)')
  .min(0, 'Amount cannot be negative')
  .max(MAX_RUPEES, 'Amount is too large')

/** A whole-rupee amount that must be more than zero (payments, challans). */
export const positiveRupeesSchema = rupeesSchema.refine((n) => n > 0, 'Amount must be more than zero')
