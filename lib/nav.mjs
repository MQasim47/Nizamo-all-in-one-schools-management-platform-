// Navigation, driven by permissions (never by role names) and by what is actually built.
// Add a module = set `built: true` when its page exists; unbuilt modules are hidden, not dead links.
import { can } from './auth/permissions.mjs'

// `perm`: user needs ANY of these. Icons are names (see components/shell/icons.js) so the server
// can pass this list to the client shell.
const ITEMS = [
  { group: 'Overview', href: '/school/dashboard', label: 'Dashboard', icon: 'dashboard', built: true },
  { group: 'Academics', href: '/school/students', label: 'Students', icon: 'students', perm: ['students.read_all'], built: false },
  { group: 'Academics', href: '/school/classes', label: 'Classes', icon: 'classes', perm: ['classes.write'], built: false },
  { group: 'Academics', href: '/school/attendance', label: 'Attendance', icon: 'attendance', perm: ['attendance.read_all', 'attendance.write_assigned'], built: false },
  { group: 'Academics', href: '/school/results', label: 'Exams & Results', icon: 'results', perm: ['results.read_all', 'results.write_assigned'], built: false },
  { group: 'Finance', href: '/school/fees', label: 'Fees', icon: 'fees', perm: ['fees.read_all'], built: false },
  { group: 'Communication', href: '/school/messages', label: 'Messages', icon: 'messages', perm: ['students.read_all'], built: false },
  { group: 'Settings', href: '/school/settings', label: 'School settings', icon: 'settings', perm: ['settings.write'], built: true },
]

const SUPERADMIN_ITEMS = [
  { group: 'Overview', href: '/school/dashboard', label: 'Dashboard', icon: 'dashboard', built: true },
  { group: 'Platform', href: '/admin/schools', label: 'Schools', icon: 'schools', built: false },
  { group: 'Platform', href: '/admin/waitlist', label: 'Waitlist', icon: 'waitlist', built: true },
  { group: 'Settings', href: '/admin/settings', label: 'Settings', icon: 'settings', built: false },
]

const GROUP_ORDER = ['Overview', 'Academics', 'Finance', 'Communication', 'Platform', 'Settings']

/** Grouped menu for a role: [{ label, items: [{ href, label, iconName }] }]. */
export function buildNav(role) {
  const source = role === 'superadmin' ? SUPERADMIN_ITEMS : ITEMS
  const visible = source.filter((i) => i.built && (role === 'superadmin' || !i.perm || i.perm.some((p) => can(role, p))))
  return GROUP_ORDER.map((label) => ({
    label,
    items: visible.filter((i) => i.group === label).map(({ href, label: l, icon }) => ({ href, label: l, iconName: icon })),
  })).filter((g) => g.items.length > 0)
}

/** True when a page exists for this path (used so dashboard rows only link to real pages). */
export function isBuilt(href) {
  return [...ITEMS, ...SUPERADMIN_ITEMS].some((i) => i.href === href && i.built)
}
