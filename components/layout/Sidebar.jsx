'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import clsx from 'clsx'
import { initials } from '@/lib/utils/format'
import { can } from '@/lib/auth/permissions.mjs'

// Navigation is driven by permissions, not by role names, so new roles (accountant, parent, ...)
// get a sensible menu automatically. The database still enforces what each role can actually read.
const NAV = [
  { section: 'Overview', items: [{ href: '/school/dashboard', icon: '⊞', label: 'Dashboard' }] },
  { section: 'School Setup', items: [
    { href: '/school/classes', icon: '🏫', label: 'Classes', perm: 'classes.write' },
    { href: '/school/subjects', icon: '📚', label: 'Subjects', perm: 'subjects.write' },
    { href: '/school/teachers', icon: '👩‍🏫', label: 'Teachers', perm: 'users.manage' },
    { href: '/school/students', icon: '👨‍🎓', label: 'Students', perm: 'students.read_all' },
    { href: '/school/general-register', icon: '📋', label: 'General Register', perm: 'students.write' },
  ] },
  { section: 'My Classes', items: [
    { href: '/school/my-students', icon: '👨‍🎓', label: 'My Students', perm: 'students.read_assigned' },
    { href: '/school/homework', icon: '📝', label: 'Homework', perm: 'homework.write_assigned' },
  ] },
  { section: 'Reports', items: [
    { href: '/school/attendance', icon: '✅', label: 'Attendance', labels: { teacher: 'Mark Attendance' }, perm: ['attendance.read_all', 'attendance.write_assigned'] },
    { href: '/school/results', icon: '📊', label: 'Results', labels: { teacher: 'Enter Marks' }, perm: ['results.read_all', 'results.write_assigned'] },
    { href: '/school/approvals', icon: '🔔', label: 'Approvals', perm: 'results.approve' },
    { href: '/school/marksheets', icon: '📄', label: 'Marksheets', perm: 'results.approve' },
    { href: '/school/result-sheet', icon: '🗂️', label: 'Result Sheet', perm: 'results.approve' },
  ] },
  { section: 'Finance', items: [{ href: '/school/fees', icon: '💰', label: 'Fee Management', perm: 'fees.read_all' }] },
  { section: 'Admin', items: [{ href: '/school/settings', icon: '⚙️', label: 'Settings', perm: 'settings.write' }] },
]

const SUPERADMIN_NAV = [
  { section: 'Super Admin', items: [
    { href: '/school/dashboard', icon: '⊞', label: 'Dashboard' },
    { href: '/school/schools', icon: '🏫', label: 'All Schools' },
    { href: '/register', icon: '➕', label: 'Register School' },
  ] },
]

function navFor(role) {
  if (role === 'superadmin') return SUPERADMIN_NAV
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (!item.perm) return true
      const perms = Array.isArray(item.perm) ? item.perm : [item.perm]
      return perms.some((p) => can(role, p))
    }),
  })).filter((group) => group.items.length > 0)
}

function NavItem({ href, icon, label, active, badge }) {
  return (
    <Link
      href={href}
      className={clsx(
        'flex items-center gap-2.5 px-[11px] py-[9px] rounded-[9px] text-[13px] font-medium no-underline transition-all',
        active
          ? 'bg-terracotta text-white'
          : 'text-[rgba(255,255,255,0.52)] hover:bg-[rgba(255,255,255,0.07)] hover:text-warm-white'
      )}
    >
      <span className="w-[18px] text-center text-[15px] flex-shrink-0">{icon}</span>
      <span>{label}</span>
      {badge > 0 && (
        <span className="ml-auto bg-gold text-espresso text-[10px] font-bold px-[6px] py-px rounded-[8px]">
          {badge}
        </span>
      )}
    </Link>
  )
}

function SectionLabel({ children }) {
  return (
    <div className="text-[9.5px] uppercase tracking-[1.5px] text-[rgba(255,255,255,0.22)] px-2 pt-1.5 pb-[5px] mt-1.5">
      {children}
    </div>
  )
}

export default function Sidebar({ pendingApprovalsCount = 0 }) {
  const pathname = usePathname()
  const { data: session } = useSession()

  if (!session) return null

  const { role, name, schoolName, schoolPlan } = session.user
  const isActive = (path) => pathname === path || pathname.startsWith(path + '/')

  return (
    <aside className="w-sidebar bg-espresso flex flex-col fixed top-0 left-0 bottom-0 z-[100] overflow-y-auto">
      {/* LOGO */}
      <div className="px-[18px] pt-[22px] pb-[18px] border-b border-[rgba(255,255,255,0.07)] flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-[34px] h-[34px] bg-terracotta rounded-[9px] flex items-center justify-center text-[17px] flex-shrink-0">
            🎓
          </div>
          <div className="font-serif text-[15px] text-warm-white">Edu4Everyone</div>
        </div>
      </div>

      {/* SCHOOL BADGE */}
      <div className="px-[18px] py-3 border-b border-[rgba(255,255,255,0.07)] flex-shrink-0">
        <div className="bg-[rgba(255,255,255,0.06)] rounded-lg px-[10px] py-2">
          <div className="text-xs font-semibold text-warm-white">{schoolName}</div>
          <div className="text-[10px] text-gold uppercase tracking-wide mt-0.5">
            ✦ {schoolPlan} Plan
          </div>
        </div>
      </div>

      {/* NAV */}
      <nav className="flex-1 px-2.5 py-3 flex flex-col gap-px">
        {navFor(role).map((group) => (
          <div key={group.section} className="flex flex-col gap-px">
            <SectionLabel>{group.section}</SectionLabel>
            {group.items.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.labels?.[role] || item.label}
                active={isActive(item.href)}
                badge={item.href === '/school/approvals' ? pendingApprovalsCount : 0}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* USER PROFILE */}
      <div className="px-2.5 py-3 border-t border-[rgba(255,255,255,0.07)] flex-shrink-0">
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] hover:bg-[rgba(255,255,255,0.06)]">
          <div className="w-8 h-8 bg-terracotta rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {initials(name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-semibold text-warm-white truncate">{name}</div>
            <div className="text-[10px] text-[rgba(255,255,255,0.38)] mt-px capitalize">{role}</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Logout"
            className="text-[rgba(255,255,255,0.3)] text-base bg-transparent border-none cursor-pointer ml-auto hover:text-white"
          >
            ⏻
          </button>
        </div>
      </div>
    </aside>
  )
}
