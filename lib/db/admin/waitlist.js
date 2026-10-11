import 'server-only'
import { z } from 'zod'
import { supabaseAdmin } from './client'
import { assertSuperadmin } from './schools'
import { WAITLIST_STATUSES } from '@/lib/waitlist-options'
import { toCsv } from '@/lib/utils/csv.mjs'

// Public insert (called by POST /api/waitlist after validation). Returns { duplicate } when
// this WhatsApp number is already on the list.
export async function addWaitlistEntry(values) {
  const { error } = await supabaseAdmin.from('waitlist').insert({
    school_name: values.school_name,
    contact_name: values.contact_name,
    city: values.city,
    student_count_range: values.student_count_range,
    whatsapp: values.whatsapp,
    email: values.email,
    source: values.source,
  })
  if (error) {
    if (error.code === '23505') return { duplicate: true }
    throw error
  }
  return { duplicate: false }
}

const statusSchema = z.enum(WAITLIST_STATUSES)

function safeSearch(text) {
  return String(text || '').replace(/[,()%*_\\"']/g, ' ').trim().slice(0, 60)
}

// ---- superadmin only ----

export async function listWaitlist(session, { status, q } = {}) {
  await assertSuperadmin(session)
  let query = supabaseAdmin
    .from('waitlist')
    .select('id, school_name, contact_name, city, student_count_range, whatsapp, email, source, status, created_at')
    .order('created_at', { ascending: false })
    .limit(2000)

  if (status && statusSchema.safeParse(status).success) query = query.eq('status', status)
  const search = safeSearch(q)
  if (search) {
    query = query.or(
      `school_name.ilike.%${search}%,contact_name.ilike.%${search}%,city.ilike.%${search}%,whatsapp.ilike.%${search}%`
    )
  }
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function updateWaitlistStatus(session, id, status) {
  await assertSuperadmin(session)
  const { error } = await supabaseAdmin
    .from('waitlist')
    .update({ status: statusSchema.parse(status) })
    .eq('id', z.string().uuid().parse(id))
  if (error) throw error
}

const CSV_COLUMNS = ['created_at', 'school_name', 'contact_name', 'city', 'student_count_range', 'whatsapp', 'email', 'status', 'source']

export function waitlistToCsv(rows) {
  return toCsv(CSV_COLUMNS, rows)
}
