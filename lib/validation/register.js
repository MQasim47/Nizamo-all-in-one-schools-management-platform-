import { z } from 'zod'
import { subdomainSchema } from './auth'
import { normalisePkMobile } from '@/lib/utils/phone.mjs'

export const registerFormSchema = z.object({
  schoolName: z.string().trim().min(2).max(120),
  subdomain: subdomainSchema,
  principalName: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  phone: z
    .string()
    .trim()
    .max(30)
    .transform((v) => normalisePkMobile(v))
    .refine((v) => v !== null, 'Enter a valid Pakistani mobile number'),
  password: z
    .string()
    .min(10, 'Use at least 10 characters')
    .max(100)
    .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), 'Use letters and at least one number'),
  website: z.string().max(200).optional(), // honeypot
})
