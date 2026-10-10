// Role -> permission map used for UI gating and server-side checks.
// The database is the real enforcement point: this MUST match the role_permissions rows in
// supabase/migrations/002_rls_and_hardening.sql (scripts/test-tenant.mjs verifies they match).
// Adding a role (accountant, parent, ...) = add a list here and rows there; policies don't change.
export const ROLE_PERMISSIONS = {
  superadmin: [],
  principal: [
    'students.read_all', 'students.write',
    'attendance.read_all', 'attendance.write_all',
    'results.read_all', 'results.write_all', 'results.approve',
    'classes.read', 'classes.write', 'subjects.read', 'subjects.write',
    'users.read', 'users.manage', 'settings.read', 'settings.write',
    'assignments.read_all', 'assignments.write', 'homework.read_all',
    'fees.read_all', 'fees.write', 'links.read_all', 'links.write', 'audit.read',
  ],
  teacher: [
    'students.read_assigned',
    'attendance.read_assigned', 'attendance.write_assigned',
    'results.read_assigned', 'results.write_assigned',
    'classes.read', 'subjects.read', 'settings.read',
    'homework.read_assigned', 'homework.write_assigned',
  ],
  accountant: ['students.read_all', 'fees.read_all', 'fees.write', 'classes.read', 'settings.read'],
  receptionist: ['students.read_all', 'students.write', 'classes.read', 'settings.read'],
  parent: [
    'students.read_linked', 'attendance.read_linked', 'results.read_linked',
    'homework.read_linked', 'fees.read_linked', 'classes.read', 'settings.read',
  ],
  student: [
    'students.read_linked', 'attendance.read_linked', 'results.read_linked',
    'homework.read_linked', 'classes.read', 'settings.read',
  ],
}

export function can(role, permission) {
  return !!ROLE_PERMISSIONS[role]?.includes(permission)
}

export function canAny(role, permissions) {
  return permissions.some((p) => can(role, p))
}
