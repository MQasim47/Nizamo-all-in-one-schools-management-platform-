import { z } from 'zod'
import { isValidDate } from '../utils/dates.mjs'

/** A school calendar date "YYYY-MM-DD" (Pakistan date, stored in DATE columns). */
export const pkDateSchema = z.string().trim().refine(isValidDate, 'Enter a valid date (YYYY-MM-DD)')
