import { studentCreateSchema, studentEditableSchema, studentLeavingSchema } from '@/lib/validation/student'
import { maskCnic, maskPhone } from '@/lib/utils/mask'

// ============================================
// STUDENTS — General Register
// Every function takes `ctx` = await getSchoolClient(session): { db, schoolId, userId, role }.
// schoolId is never a parameter. Row-level security in Postgres enforces the school and role
// limits (teachers: assigned classes only; parents: linked children only).
// ============================================

// Lists never select CNIC / B-Form / address; contact is masked. Full record: getStudentById.
const LIST_COLUMNS = `
  id, gr_number, roll_number, name, father_name, contact, class_id, status, date_of_admission,
  classes:class_id ( id, name, section )
`

function maskForList(row) {
  return { ...row, contact: maskPhone(row.contact) }
}

// PostgREST .or() splits on commas/parentheses; strip them (and LIKE wildcards) from user text.
function safeSearch(text) {
  return String(text).replace(/[,()%*_\\"']/g, ' ').trim().slice(0, 60)
}

export async function getStudents(ctx, filters = {}) {
  let query = ctx.db
    .from('students')
    .select(LIST_COLUMNS)
    .is('deleted_at', null)
    .eq('status', filters.status || 'active')

  if (filters.classId) query = query.eq('class_id', filters.classId)

  const search = filters.search ? safeSearch(filters.search) : ''
  if (search) {
    query = query.or(
      `name.ilike.%${search}%,roll_number.ilike.%${search}%,father_name.ilike.%${search}%`
    )
  }

  const { data, error } = await query.order('roll_number', { ascending: true })
  if (error) throw error
  return data.map(maskForList)
}

// Detail page: full record, sensitive fields included (RLS still limits who can load it).
// `masked: true` returns CNIC fields masked for roles that should not see them in full.
export async function getStudentById(ctx, studentId, { masked = false } = {}) {
  const { data, error } = await ctx.db
    .from('students')
    .select('*, classes:class_id ( id, name, section )')
    .eq('id', studentId)
    .single()
  if (error) throw error
  if (!masked) return data
  return { ...data, father_cnic: maskCnic(data.father_cnic), mother_cnic: maskCnic(data.mother_cnic), b_form_number: maskCnic(data.b_form_number) }
}

// Teachers are limited by RLS to their assigned classes already; this just narrows by class.
export async function getMyStudents(ctx, classId = null) {
  let query = ctx.db.from('students').select(LIST_COLUMNS).is('deleted_at', null).eq('status', 'active')
  if (classId) query = query.eq('class_id', classId)
  const { data, error } = await query.order('roll_number')
  if (error) throw error
  return data.map(maskForList)
}

// GR number is assigned by the database (atomic, numeric) unless the caller supplies one.
export async function addStudent(ctx, payload) {
  const values = studentCreateSchema.parse(payload)
  const { data, error } = await ctx.db
    .from('students')
    .insert({ ...values, school_id: ctx.schoolId })
    .select()
    .single()
  if (error) throw error
  return data
}

// Only whitelisted columns; unknown keys (school_id, id, status ...) are rejected, not ignored.
export async function updateStudent(ctx, studentId, payload) {
  const values = studentEditableSchema.parse(payload)
  const { data, error } = await ctx.db
    .from('students')
    .update(values)
    .eq('id', studentId)
    .select()
    .single()
  if (error) throw error
  return data
}

// Soft delete: the General Register is a legal record. Reversible with restoreStudent().
export async function deleteStudent(ctx, studentId) {
  const { error } = await ctx.db
    .from('students')
    .update({ deleted_at: new Date().toISOString(), deleted_by: ctx.userId })
    .eq('id', studentId)
  if (error) throw error
}

export async function restoreStudent(ctx, studentId) {
  const { error } = await ctx.db
    .from('students')
    .update({ deleted_at: null, deleted_by: null })
    .eq('id', studentId)
  if (error) throw error
}

// Mark student as "left" and record leaving details — used before SLC generation
export async function markStudentLeaving(ctx, studentId, payload) {
  const values = studentLeavingSchema.parse(payload)
  const { data, error } = await ctx.db
    .from('students')
    .update({ ...values, status: 'left', promoted_to_class: values.promoted_to_class || null })
    .eq('id', studentId)
    .select()
    .single()
  if (error) throw error
  return data
}

// rows: [[rollNumber, name, fatherName, contact], ...]. One lookup + one insert; GR numbers
// are assigned in order by the database trigger.
export async function bulkImportStudents(ctx, classId, rows) {
  const { data: existing, error: exErr } = await ctx.db
    .from('students')
    .select('roll_number')
    .eq('class_id', classId)
  if (exErr) throw exErr
  const taken = new Set(existing.map((s) => s.roll_number))

  const toInsert = []
  let skipped = 0
  for (const row of rows) {
    const [rollNumber, name, fatherName, contact] = row
    const roll = rollNumber ? String(rollNumber).trim() : ''
    if (!roll || !name || taken.has(roll)) {
      skipped++
      continue
    }
    taken.add(roll)
    toInsert.push({
      school_id: ctx.schoolId,
      class_id: classId,
      roll_number: roll,
      name: String(name).trim(),
      father_name: fatherName ? String(fatherName).trim() : null,
      contact: contact ? String(contact).trim() : null,
    })
  }

  if (toInsert.length) {
    const { error } = await ctx.db.from('students').insert(toInsert)
    if (error) throw error
  }
  return { imported: toInsert.length, skipped }
}

export async function getStudentCount(ctx) {
  const { count, error } = await ctx.db
    .from('students')
    .select('id', { count: 'exact', head: true })
    .is('deleted_at', null)
    .eq('status', 'active')
  if (error) throw error
  return count
}
