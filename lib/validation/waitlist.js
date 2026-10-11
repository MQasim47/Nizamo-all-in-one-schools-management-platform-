import { z } from 'zod'
import { normalisePkMobile } from '@/lib/utils/phone.mjs'

export { STUDENT_RANGES, WAITLIST_STATUSES } from '@/lib/waitlist-options'
import { STUDENT_RANGES } from '@/lib/waitlist-options'

const clean = (max) => z.string().trim().min(2).max(max)

export const waitlistSchema = z.object({
  school_name: clean(120),
  contact_name: clean(80),
  city: clean(60),
  student_count_range: z.enum(Object.keys(STUDENT_RANGES)),
  whatsapp: z
    .string()
    .trim()
    .max(30)
    .transform((v) => normalisePkMobile(v))
    .refine((v) => v !== null, 'Enter a valid Pakistani mobile number, e.g. 0300 1234567'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email'),
  // utm_source=...&utm_medium=...; stored as plain text
  source: z.string().trim().max(200).optional().transform((v) => v || null),
  // Honeypot: real people never fill this
  website: z.string().max(200).optional(),
})
