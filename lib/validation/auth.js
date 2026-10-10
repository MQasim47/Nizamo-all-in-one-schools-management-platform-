import { z } from 'zod'

// Subdomain rules mirror register_school() in the database.
export const subdomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/, 'Invalid school address')

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
  subdomain: subdomainSchema,
})
