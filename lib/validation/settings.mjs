import { z } from 'zod'

// School settings that the settings page (and the mobile app later) may change.
// .strict(): any other key (school_id, passing_percentage, ...) is rejected, never passed on.
export const settingsPatchSchema = z
  .object({
    hijri_offset: z
      .number({ error: 'Choose a number from -2 to +2.' })
      .int('Choose a whole number from -2 to +2.')
      .min(-2, 'Choose a number from -2 to +2.')
      .max(2, 'Choose a number from -2 to +2.'),
  })
  .strict()
