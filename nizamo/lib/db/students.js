import { supabaseAdmin } from '../supabase'

// ============================================
// STUDENTS — CRUD + General Register fields
// ============================================

export async function getStudents(schoolId, filters = {}) {
  let query = supabaseAdmin
    .from('students')
    .select(`
      *,
      classes:class_id ( id, name, section )
    `)
    .eq('school_id', schoolId)
    .eq('status', filters.status || 'active')

  if (filters.classId) {
    query = query.eq('class_id', filters.classId)
  }

  if (filters.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,roll_number.ilike.%${filters.search}%,father_name.ilike.%${filters.search}%`
    )
  }

  query = query.order('roll_number', { ascending: true })

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getStudentById(studentId, schoolId) {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select(`
      *,
      classes:class_id ( id, name, section )
    `)
    .eq('id', studentId)
    .eq('school_id', schoolId)
    .single()

  if (error) throw error
  return data
}

export async function getStudentsByTeacher(teacherId, schoolId, classId = null) {
  const { data: assignments } = await supabaseAdmin
    .from('teacher_assignments')
    .select('class_id')
    .eq('teacher_id', teacherId)
    .eq('school_id', schoolId)

  const classIds = [...new Set((assignments || []).map((a) => a.class_id))]
  if (classIds.length === 0) return []

  const { data, error } = await supabaseAdmin
    .from('students')
    .select(`*, classes:class_id ( id, name, section )`)
    .eq('school_id', schoolId)
    .eq('status', 'active')
    .in('class_id', classId ? [classId] : classIds)
    .order('roll_number')

  if (error) throw error
  return data
}

// Get the next suggested GR number for a school
export async function getNextGRNumber(schoolId) {
  const { data, error } = await supabaseAdmin
    .from('students')
    .select('gr_number')
    .eq('school_id', schoolId)
    .not('gr_number', 'is', null)
    .order('gr_number', { ascending: false })
    .limit(1)
    .single()

  if (error || !data?.gr_number) return '1001'
  const num = parseInt(data.gr_number, 10)
  return isNaN(num) ? '1001' : String(num + 1)
}

// Basic add (matches old PHP quick-add modal)
export async function addStudentBasic(schoolId, payload) {
  const grNumber = payload.grNumber || (await getNextGRNumber(schoolId))

  const { data, error } = await supabaseAdmin
    .from('students')
    .insert({
      school_id: schoolId,
      class_id: payload.classId,
      gr_number: grNumber,
      roll_number: payload.rollNumber,
      name: payload.name,
      father_name: payload.fatherName,
      contact: payload.contact,
      date_of_admission: payload.dateOfAdmission || new Date().toISOString().split('T')[0],
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Full General Register add — all the fields schools asked for
export async function addStudentFull(schoolId, payload) {
  const grNumber = payload.grNumber || (await getNextGRNumber(schoolId))

  const { data, error } = await supabaseAdmin
    .from('students')
    .insert({
      school_id: schoolId,
      class_id: payload.classId,

      gr_number: grNumber,
      roll_number: payload.rollNumber,
      name: payload.name,
      father_name: payload.fatherName,
      mother_name: payload.motherName,
      guardian_name: payload.guardianName,
      guardian_relationship: payload.guardianRelationship,

      date_of_birth: payload.dateOfBirth || null,
      place_of_birth: payload.placeOfBirth,
      gender: payload.gender,
      religion: payload.religion || 'Islam',
      caste: payload.caste,
      nationality: payload.nationality || 'Pakistani',
      b_form_number: payload.bFormNumber,
      father_cnic: payload.fatherCnic,
      mother_cnic: payload.motherCnic,

      contact: payload.contact,
      home_address: payload.homeAddress,
      emergency_contact: payload.emergencyContact,

      last_school_name: payload.lastSchoolName,
      last_school_tc_number: payload.lastSchoolTcNumber,
      last_school_leaving_date: payload.lastSchoolLeavingDate || null,
      last_class_attended: payload.lastClassAttended,

      date_of_admission: payload.dateOfAdmission || new Date().toISOString().split('T')[0],
      admitted_in_class: payload.admittedInClass,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateStudent(studentId, schoolId, payload) {
  const { data, error } = await supabaseAdmin
    .from('students')
    .update(payload)
    .eq('id', studentId)
    .eq('school_id', schoolId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteStudent(studentId, schoolId) {
  const { error } = await supabaseAdmin
    .from('students')
    .delete()
    .eq('id', studentId)
    .eq('school_id', schoolId)

  if (error) throw error
}

// Mark student as "left" and record leaving details — used before SLC generation
export async function markStudentLeaving(studentId, schoolId, payload) {
  const { data, error } = await supabaseAdmin
    .from('students')
    .update({
      status: 'left',
      date_of_leaving: payload.dateOfLeaving,
      leaving_reason: payload.leavingReason,
      leaving_class: payload.leavingClass,
      promoted_to_class: payload.promotedToClass || null,
    })
    .eq('id', studentId)
    .eq('school_id', schoolId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function bulkImportStudents(schoolId, classId, rows) {
  let imported = 0
  let skipped = 0

  let nextGR = parseInt(await getNextGRNumber(schoolId), 10)

  for (const row of rows) {
    const [rollNumber, name, fatherName, contact] = row

    if (!rollNumber || !name) {
      skipped++
      continue
    }

    const { data: existing } = await supabaseAdmin
      .from('students')
      .select('id')
      .eq('school_id', schoolId)
      .eq('class_id', classId)
      .eq('roll_number', String(rollNumber).trim())
      .single()

    if (existing) {
      skipped++
      continue
    }

    await supabaseAdmin.from('students').insert({
      school_id: schoolId,
      class_id: classId,
      gr_number: String(nextGR),
      roll_number: String(rollNumber).trim(),
      name: String(name).trim(),
      father_name: fatherName ? String(fatherName).trim() : null,
      contact: contact ? String(contact).trim() : null,
    })

    nextGR++
    imported++
  }

  return { imported, skipped }
}

export async function getStudentCount(schoolId) {
  const { count, error } = await supabaseAdmin
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('status', 'active')

  if (error) throw error
  return count
}
