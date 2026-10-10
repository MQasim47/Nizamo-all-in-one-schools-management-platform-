// ============================================
// CLASSES, SUBJECTS, TEACHER ASSIGNMENTS
// Every function takes `ctx` = await getSchoolClient(session). RLS enforces the school.
// ============================================

// ---------- CLASSES ----------

export async function getClasses(ctx) {
  const { data, error } = await ctx.db
    .from('classes')
    .select('*, students:students(count)')
    .order('name')
    .order('section')
  if (error) throw error
  return data
}

export async function getClassesForTeacher(ctx, teacherId = ctx.userId) {
  const { data, error } = await ctx.db
    .from('teacher_assignments')
    .select('class_id, classes:class_id ( id, name, section )')
    .eq('teacher_id', teacherId)
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

export async function addClass(ctx, { name, section, academicYear }) {
  const { data, error } = await ctx.db
    .from('classes')
    .insert({ school_id: ctx.schoolId, name, section, academic_year: academicYear })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new Error(`${name} ${section} already exists.`)
    throw error
  }
  return data
}

export async function deleteClass(ctx, classId) {
  const { count } = await ctx.db
    .from('students')
    .select('id', { count: 'exact', head: true })
    .eq('class_id', classId)

  if (count > 0) throw new Error(`Cannot delete: ${count} students are in this class.`)

  const { error } = await ctx.db.from('classes').delete().eq('id', classId)
  if (error) throw error
}

// ---------- SUBJECTS ----------

export async function getSubjects(ctx) {
  const { data, error } = await ctx.db
    .from('subjects')
    .select('*, teacher_assignments:teacher_assignments(count)')
    .order('name')
  if (error) throw error
  return data
}

export async function getSubjectsForTeacherInClass(ctx, classId, teacherId = ctx.userId) {
  const { data, error } = await ctx.db
    .from('teacher_assignments')
    .select('subject_id, subjects:subject_id ( id, name, code )')
    .eq('teacher_id', teacherId)
    .eq('class_id', classId)
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

export async function addSubject(ctx, { name, code }) {
  const { data, error } = await ctx.db
    .from('subjects')
    .insert({ school_id: ctx.schoolId, name, code })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') throw new Error(`'${name}' already exists.`)
    throw error
  }
  return data
}

export async function deleteSubject(ctx, subjectId) {
  const { error } = await ctx.db.from('subjects').delete().eq('id', subjectId)
  if (error) throw error
}

// ---------- TEACHER ASSIGNMENTS ----------

export async function getTeacherAssignments(ctx, teacherId) {
  const { data, error } = await ctx.db
    .from('teacher_assignments')
    .select('class_id, subject_id')
    .eq('teacher_id', teacherId)
  if (error) throw error

  return {
    classIds: [...new Set(data.map((d) => d.class_id))],
    subjectIds: [...new Set(data.map((d) => d.subject_id))],
  }
}

// Insert the missing pairs first, then delete the ones no longer wanted: a failure part-way
// leaves the teacher with MORE access, never with all assignments wiped. Classes and subjects
// from another school are rejected by the composite foreign keys.
export async function saveTeacherAssignments(ctx, teacherId, classIds, subjectIds) {
  const wanted = new Map()
  for (const classId of classIds) {
    for (const subjectId of subjectIds) wanted.set(`${classId}:${subjectId}`, { classId, subjectId })
  }

  const { data: current, error: curErr } = await ctx.db
    .from('teacher_assignments')
    .select('id, class_id, subject_id')
    .eq('teacher_id', teacherId)
  if (curErr) throw curErr

  const have = new Set(current.map((r) => `${r.class_id}:${r.subject_id}`))
  const toAdd = [...wanted.entries()]
    .filter(([key]) => !have.has(key))
    .map(([, v]) => ({
      school_id: ctx.schoolId,
      teacher_id: teacherId,
      class_id: v.classId,
      subject_id: v.subjectId,
    }))
  const toRemove = current.filter((r) => !wanted.has(`${r.class_id}:${r.subject_id}`)).map((r) => r.id)

  if (toAdd.length) {
    const { error } = await ctx.db.from('teacher_assignments').insert(toAdd)
    if (error) throw error
  }
  if (toRemove.length) {
    const { error } = await ctx.db.from('teacher_assignments').delete().in('id', toRemove)
    if (error) throw error
  }
}

export async function verifyTeacherAssignment(ctx, teacherId, classId, subjectId) {
  const { data } = await ctx.db
    .from('teacher_assignments')
    .select('id')
    .eq('teacher_id', teacherId)
    .eq('class_id', classId)
    .eq('subject_id', subjectId)
    .maybeSingle()
  return !!data
}
