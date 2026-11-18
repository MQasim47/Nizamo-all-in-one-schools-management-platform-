// "Attendance today" numbers for the home page, as one pure function so the rule is testable.
// A user who may see every class's attendance (attendance.read_all) gets the whole school.
// Anyone else (a teacher) gets ONLY the classes they are assigned to: a teacher must never be told
// that classes they do not teach are "not marked".

/**
 * @param {object} p
 * @param {string[]} p.classIds        every class id the user can read
 * @param {string[]|null} p.assignedClassIds  the teacher's assigned class ids, or null = whole school
 * @param {{class_id: string, status: string}[]} p.attendance  today's attendance rows the user can read
 * @returns {{ total: number, marked: number, left: number, present: number, recorded: number }}
 */
export function attendanceGlance({ classIds, assignedClassIds, attendance }) {
  const all = new Set(classIds || [])
  const scope = assignedClassIds == null ? all : new Set(assignedClassIds.filter((id) => all.has(id)))
  const rows = (attendance || []).filter((r) => scope.has(r.class_id))
  const marked = new Set(rows.map((r) => r.class_id)).size
  const present = rows.filter((r) => r.status === 'present' || r.status === 'late').length
  return { total: scope.size, marked, left: Math.max(0, scope.size - marked), present, recorded: rows.length }
}
