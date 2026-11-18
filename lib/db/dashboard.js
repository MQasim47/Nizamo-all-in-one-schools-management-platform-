import { cache } from 'react'
import { getSchoolClient } from '@/lib/supabase/school'
import { can } from '@/lib/auth/permissions.mjs'
import { DEFAULT_HIJRI_OFFSET, clampHijriOffset, formatWhenPk, monthStartPk, todayPk } from '@/lib/utils/dates.mjs'
import { formatNumber, formatRs } from '@/lib/utils/money.mjs'
import { isBuilt } from '@/lib/nav.mjs'
import { attendanceGlance } from '@/lib/dashboard/attendance-glance.mjs'

// Read-only numbers for the school's home page and shell. Everything goes through the user's own
// school client (RLS decides what each role may see); nothing here takes a school id from input.

/** Lightweight settings read for the shell (academic session, logo, Hijri adjustment). Never writes. */
export const getShellSettings = cache(async (session) => {
  const ctx = await getSchoolClient(session)
  let res = await ctx.db.from('school_settings').select('academic_year, logo_url, hijri_offset').maybeSingle()
  if (res.error) res = await ctx.db.from('school_settings').select('academic_year, logo_url').maybeSingle() // before migration 004
  const d = res.data || {}
  const logo = typeof d.logo_url === 'string' && /^https:\/\//i.test(d.logo_url) ? d.logo_url : null
  return {
    academicYear: d.academic_year || null,
    logoUrl: logo,
    hijriOffset: d.hijri_offset === undefined || d.hijri_offset === null ? DEFAULT_HIJRI_OFFSET : clampHijriOffset(d.hijri_offset),
  }
})

const VERB = { INSERT: 'added', UPDATE: 'updated', DELETE: 'removed' }
const NOUN = {
  students: 'a student',
  results: 'marks',
  fee_payments: 'a fee payment',
  fee_types: 'a fee type',
  fee_structures: 'a fee structure',
  school_settings: 'the school settings',
  users: 'a staff account',
  classes: 'a class',
  subjects: 'a subject',
  attendance: 'attendance',
  teacher_assignments: 'a teacher assignment',
  user_students: 'a family link',
  schools: 'the school details',
}

function describe(row, actor) {
  const verb = VERB[row.action] || 'changed'
  const noun = NOUN[row.table_name] || 'a record'
  const named = row.table_name === 'students' && typeof row.new_data?.name === 'string' ? `student ${row.new_data.name}` : noun
  return `${actor} ${verb} ${named}`
}

async function safe(fn) {
  try {
    return { ok: true, value: await fn() }
  } catch {
    return { ok: false }
  }
}

/** Everything the principal's home needs. Each block reports its own failure so one slow table never blanks the page. */
export async function getPrincipalSummary(session) {
  const ctx = await getSchoolClient(session)
  const role = ctx.role
  const today = todayPk()
  const settings = await getShellSettings(session)

  const count = async (table, build) => {
    const q = ctx.db.from(table).select('id', { count: 'exact', head: true })
    const { count: n, error } = await (build ? build(q) : q)
    if (error) throw error
    return n || 0
  }

  const [students, classes, subjects, staff, attendance, approvals, fees, activity, classScope] = await Promise.all([
    safe(() => count('students', (q) => q.is('deleted_at', null))),
    safe(() => count('classes')),
    safe(() => count('subjects')),
    safe(() => count('users', (q) => q.eq('role', 'teacher').eq('status', 'active'))),
    safe(async () => {
      const { data, error } = await ctx.db.from('attendance').select('class_id, status').eq('date', today).limit(20000)
      if (error) throw error
      return data || []
    }),
    safe(async () => {
      if (!can(role, 'results.approve')) return null
      const { data, error } = await ctx.db.from('results').select('class_id, subject_id, exam_type').eq('status', 'pending').limit(5000)
      if (error) throw error
      return new Set((data || []).map((r) => `${r.class_id}-${r.subject_id}-${r.exam_type}`)).size
    }),
    safe(async () => {
      if (!can(role, 'fees.read_all')) return null
      const { data, error } = await ctx.db.from('fee_payments').select('amount_paid').gte('payment_date', monthStartPk()).limit(20000)
      if (error) throw error
      return { total: (data || []).reduce((s, r) => s + Number(r.amount_paid || 0), 0), n: (data || []).length }
    }),
    safe(async () => {
      if (!can(role, 'audit.read')) return []
      const { data, error } = await ctx.db.from('audit_log').select('id, user_id, table_name, action, new_data, created_at').order('created_at', { ascending: false }).limit(8)
      if (error) throw error
      const ids = [...new Set((data || []).map((r) => r.user_id).filter(Boolean))]
      let names = {}
      if (ids.length) {
        const { data: users } = await ctx.db.from('users').select('id, name').in('id', ids)
        names = Object.fromEntries((users || []).map((u) => [u.id, u.name]))
      }
      return (data || []).map((r) => ({ id: r.id, text: describe(r, names[r.user_id] || 'Someone'), when: formatWhenPk(r.created_at) }))
    }),
    // Which classes the attendance numbers are about: the whole school, or only the teacher's own.
    safe(async () => {
      const { data, error } = await ctx.db.from('classes').select('id').limit(5000)
      if (error) throw error
      const classIds = (data || []).map((c) => c.id)
      if (can(role, 'attendance.read_all')) return { classIds, assignedClassIds: null }
      const { data: ta, error: taError } = await ctx.db
        .from('teacher_assignments')
        .select('class_id')
        .eq('school_id', ctx.schoolId)
        .eq('teacher_id', ctx.userId)
        .limit(5000)
      if (taError) throw taError
      return { classIds, assignedClassIds: (ta || []).map((r) => r.class_id) }
    }),
  ])

  // ---- "Today at a glance": only facts we can state truthfully; links only to pages that exist ----
  const glance = []
  const link = (href) => (isBuilt(href) ? href : undefined)
  let glanceFailed = false

  if (classScope.ok && attendance.ok) {
    const { total, marked, left, present, recorded } = attendanceGlance({ ...classScope.value, attendance: attendance.value })
    if (total > 0) {
      glance.push({
        label: 'Attendance today',
        value: `${formatNumber(marked)} of ${formatNumber(total)}`,
        detail: left ? `${left} ${left === 1 ? 'class' : 'classes'} not marked yet` : 'Every class is marked',
        href: link('/school/attendance'),
        action: left > 0,
      })
    }
    if (recorded) {
      const pct = Math.round((present / recorded) * 100)
      glance.push({ label: 'Students present', value: `${pct}%`, detail: `${formatNumber(present)} of ${formatNumber(recorded)} marked today`, progress: pct, href: link('/school/attendance') })
    }
  } else glanceFailed = true

  if (fees.ok && fees.value && fees.value.n > 0) {
    glance.push({ label: 'Fee collected this month', value: formatRs(fees.value.total), detail: `${formatNumber(fees.value.n)} ${fees.value.n === 1 ? 'payment' : 'payments'} so far`, href: link('/school/fees') })
  } else if (!fees.ok) glanceFailed = true

  if (approvals.ok && approvals.value) {
    glance.push({ label: 'Result approvals waiting', value: formatNumber(approvals.value), detail: 'Marks are waiting for your approval', href: link('/school/results'), action: true })
  } else if (!approvals.ok) glanceFailed = true

  const done = (r) => r.ok && r.value > 0
  const checklist = [
    { id: 'session', label: 'Choose the academic session', done: !!settings.academicYear },
    { id: 'classes', label: 'Add your classes', done: done(classes), href: link('/school/classes') },
    { id: 'subjects', label: 'Add subjects', done: done(subjects), href: link('/school/classes') },
    { id: 'staff', label: 'Add teachers and staff', done: done(staff) },
    { id: 'students', label: 'Add or import students', done: done(students), href: link('/school/students') },
  ].map((s) => ({ ...s, comingSoon: !s.done && !s.href }))

  return {
    settings,
    glance,
    glanceFailed,
    activity: activity.ok ? activity.value : [],
    activityFailed: !activity.ok,
    checklist,
    checklistComplete: checklist.every((s) => s.done),
    canSeeActivity: can(role, 'audit.read'),
  }
}
