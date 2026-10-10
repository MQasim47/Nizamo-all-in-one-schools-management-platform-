import { z } from 'zod'

const text = (max = 200) => z.string().trim().max(max).nullable().optional()
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').nullable().optional()

// The ONLY columns of `students` a client may set. school_id, id, gr_number, status,
// deleted_* and timestamps are deliberately absent, and .strict() rejects unknown keys
// instead of silently passing them to the database.
export const studentEditableSchema = z
  .object({
    class_id: z.string().uuid().optional(),
    roll_number: z.string().trim().min(1).max(30).optional(),
    name: z.string().trim().min(1).max(120).optional(),
    father_name: text(120),
    mother_name: text(120),
    guardian_name: text(120),
    guardian_relationship: text(60),
    date_of_birth: date,
    place_of_birth: text(120),
    gender: z.enum(['male', 'female', 'other']).nullable().optional(),
    religion: text(60),
    caste: text(60),
    nationality: text(60),
    b_form_number: text(30),
    father_cnic: text(30),
    mother_cnic: text(30),
    contact: text(30),
    home_address: text(300),
    emergency_contact: text(30),
    last_school_name: text(160),
    last_school_tc_number: text(60),
    last_school_leaving_date: date,
    last_class_attended: text(60),
    date_of_admission: date,
    admitted_in_class: text(60),
  })
  .strict()

export const studentCreateSchema = studentEditableSchema.required({
  class_id: true,
  roll_number: true,
  name: true,
})

export const studentLeavingSchema = z
  .object({
    date_of_leaving: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    leaving_reason: z.enum(['tc', 'result', 'removal', 'other']),
    leaving_class: text(60),
    promoted_to_class: text(60),
  })
  .strict()
