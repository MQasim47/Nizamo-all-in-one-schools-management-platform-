import { supabaseAdmin } from '../supabase'

// ============================================
// CLASSES
// ============================================

export async function getClasses(schoolId) {
  const { data, error } = await supabaseAdmin
    .from('classes')
    .select(`
      *,
      students:students(count)
    `)
    .eq('school_id', schoolId)
    .order('name')
    .order('section')

  if (error) throw error
  return data
}

export async function getClassesForTeacher(teacherId, schoolId) {
  const { data, error } = await supabaseAdmin
    .from('teacher_assignments')
    .select(`
      class_id,
      classes:class_id ( id, name, section )
    `)
    .eq('teacher_id', teacherId)
    .eq('school_id', schoolId)

  if (error) throw error

  const seen = new Set()
  const result = []
  for (const row of data) {
    if (!seen.has(row.class_id)) {
      seen.add(row.class_id)
      result.push(row.classes)
    }
  }
  return result
}

export async function addClass(schoolId, { name, section, academicYear }) {
  const { data, error } = await supabaseAdmin
    .from('classes')
    .insert({
      school_id: schoolId,
      name,
      section,
      academic_year: academicYear || '2025-2026',
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(`${name} ${section} already exists.`)
    }
    throw error
  }
  return data
}

export async function deleteClass(classId, schoolId) {
  const { count } = await supabaseAdmin
    .from('students')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', classId)
    .eq('school_id', schoolId)

  if (count > 0) {
    throw new Error(`Cannot delete: ${count} students are in this class.`)
  }

  const { error } = await supabaseAdmin
    .from('classes')
    .delete()
    .eq('id', classId)
    .eq('school_id', schoolId)

  if (error) throw error
}

// ============================================
// SUBJECTS
// ============================================

export async function getSubjects(schoolId) {
  const { data, error } = await supabaseAdmin
    .from('subjects')
    .select(`
      *,
      teacher_assignments:teacher_assignments(count)
    `)
    .eq('school_id', schoolId)
    .order('name')

  if (error) throw error
  return data
}

export async function getSubjectsForTeacherInClass(teacherId, classId, schoolId) {
  const { data, error } = await supabaseAdmin
    .from('teacher_assignments')
    .select(`
      subject_id,
      subjects:subject_id ( id, name, code )
    `)
    .eq('teacher_id', teacherId)
    .eq('class_id', classId)
    .eq('school_id', schoolId)

  if (error) throw error

  const seen = new Set()
  const result = []
  for (const row of data) {
    if (!seen.has(row.subject_id)) {
      seen.add(row.subject_id)
      result.push(row.subjects)
    }
  }
  return result
}

export async function addSubject(schoolId, { name, code }) {
  const { data, error } = await supabaseAdmin
    .from('subjects')
    .insert({ school_id: schoolId, name, code })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error(`'${name}' already exists.`)
    }
    throw error
  }
  return data
}

export async function deleteSubject(subjectId, schoolId) {
  const { error } = await supabaseAdmin
    .from('subjects')
    .delete()
    .eq('id', subjectId)
    .eq('school_id', schoolId)

  if (error) throw error
}

// ============================================
// TEACHER ASSIGNMENTS
// ============================================

export async function getTeacherAssignments(teacherId, schoolId) {
  const { data, error } = await supabaseAdmin
    .from('teacher_assignments')
    .select('class_id, subject_id')
    .eq('teacher_id', teacherId)
    .eq('school_id', schoolId)

  if (error) throw error

  return {
    classIds: [...new Set(data.map((d) => d.class_id))],
    subjectIds: [...new Set(data.map((d) => d.subject_id))],
  }
}

export async function saveTeacherAssignments(teacherId, schoolId, classIds, subjectIds) {
  await supabaseAdmin
    .from('teacher_assignments')
    .delete()
    .eq('teacher_id', teacherId)
    .eq('school_id', schoolId)

  const rows = []
  for (const classId of classIds) {
    for (const subjectId of subjectIds) {
      rows.push({
        school_id: schoolId,
        teacher_id: teacherId,
        class_id: classId,
        subject_id: subjectId,
      })
    }
  }

  if (rows.length > 0) {
    const { error } = await supabaseAdmin.from('teacher_assignments').insert(rows)
    if (error) throw error
  }
}

export async function verifyTeacherAssignment(teacherId, classId, subjectId, schoolId) {
  const { data } = await supabaseAdmin
    .from('teacher_assignments')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('class_id', classId)
    .eq('subject_id', subjectId)
    .eq('school_id', schoolId)
    .single()

  return !!data
}
