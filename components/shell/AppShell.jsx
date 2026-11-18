'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { ChevronDown, LogOut, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react'
import { LogoMark } from '@/components/ui/Logo'
import Badge from '@/components/ui/Pill'
import Menu from '@/components/ui/Menu'
import Modal from '@/components/ui/Modal'
import { Input } from '@/components/ui/FormControl'
import { initials } from '@/lib/utils/format'
import { useStoredValue } from '@/lib/hooks/use-stored-value'
import { ICONS } from './icons'

const noSubscribe = () => () => {}

// The app frame shared by the school portal and the super-admin area.
//   brand:  { name, logoUrl?, mark? }  the SCHOOL's identity (this is their portal); mark: 'nizamo' = platform area
//   nav:    [{ label, items: [{ href, label, icon, badge? }] }]   already filtered by permission
//   user:   { name, email?, roleLabel }
//   sessionLabel: "Session 2025-26"    academic session pill (omit for super admin)
//   onSignOut: () => void
// `embedded` renders the same frame inside a fixed-height box (used by the /design preview), where
// links call onNavigate instead of changing the URL.
const STORAGE_KEY = 'nz-nav-collapsed'

function SchoolMark({ brand, size = 32 }) {
  const box = { width: size, height: size }
  // The platform area (super admin) is Nizamo's own portal: show our logo mark, not initials.
  if (brand.mark === 'nizamo') {
    return (
      <span style={box} aria-hidden="true" className="flex shrink-0 items-center justify-center">
        <LogoMark size={size} />
      </span>
    )
  }
  return brand.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={brand.logoUrl} alt="" style={box} className="shrink-0 rounded-lg border border-line bg-surface object-contain" />
  ) : (
    <span style={box} aria-hidden="true" className="flex shrink-0 items-center justify-center rounded-lg bg-espresso font-serif text-[14px] text-cream">
      {initials(brand.name)}
    </span>
  )
}

function NavLink({ item, active, collapsed, onSelect }) {
  const Icon = item.icon || ICONS[item.iconName] || ICONS.dashboard
  const cls = clsx(
    'group relative flex items-center gap-3 rounded-ctl px-2.5 py-2 text-body font-medium transition-colors duration-150 ease-out',
    collapsed && 'justify-center px-0',
    active ? 'bg-accent-soft text-ink' : 'text-ink-2 hover:bg-sunken hover:text-ink'
  )
  const content = (
    <>
      {active && <span aria-hidden="true" className="absolute -left-2.5 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-accent" />}
      <Icon size={18} strokeWidth={1.75} className={clsx('shrink-0', active ? 'text-accent-text' : 'text-ink-3 group-hover:text-ink-2')} aria-hidden="true" />
      <span className={clsx('truncate', collapsed && 'sr-only')}>{item.label}</span>
      {item.badge > 0 && (
        <span className={clsx('ml-auto rounded-full bg-accent-strong px-1.5 text-caption font-semibold text-white', collapsed && 'absolute -top-0.5 right-0 ml-0 px-1 text-[10px] leading-4')}>
          <span className="sr-only">{item.badge} waiting: </span>
          {item.badge}
        </span>
      )}
    </>
  )
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      onClick={(e) => onSelect?.(e, item.href)}
      className={cls}
    >
      {content}
    </Link>
  )
}

function SidebarBody({ brand, nav, user, activeHref, collapsed, onSelect, onSignOut, onToggle, drawer }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* the school */}
      <div className={clsx('flex items-center gap-3 border-b border-line px-4 py-4', collapsed && 'justify-center px-2')}>
        <SchoolMark brand={brand} />
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-body font-semibold leading-5 text-ink">{brand.name}</p>
            <p className="text-caption text-ink-3">{brand.subtitle || 'School portal'}</p>
          </div>
        )}
        {!drawer && !collapsed && (
          <button type="button" onClick={onToggle} aria-label="Collapse sidebar" className="flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink">
            <PanelLeftClose size={18} strokeWidth={1.75} />
          </button>
        )}
      </div>
      {!drawer && collapsed && (
        <button type="button" onClick={onToggle} aria-label="Expand sidebar" className="mx-auto mt-2 flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink">
          <PanelLeftOpen size={18} strokeWidth={1.75} />
        </button>
      )}

      {/* navigation */}
      <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {nav.map((group, gi) => (
          <div key={group.label} className={clsx(gi > 0 && 'mt-5')}>
            {collapsed ? (
              gi > 0 && <div className="mx-2 mb-3 border-t border-line" />
            ) : (
              <p className="px-2.5 pb-1.5 text-caption font-semibold uppercase tracking-wider text-ink-3">{group.label}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} active={item.href === activeHref || activeHref?.startsWith(item.href + '/')} collapsed={collapsed} onSelect={onSelect} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* the person, and Nizamo's quiet credit */}
      <div className="border-t border-line px-4 py-3">
        <div className={clsx('flex items-center gap-3', collapsed && 'flex-col gap-2')}>
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-caption font-semibold text-accent-text">
            {initials(user.name)}
          </span>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-label font-medium text-ink">{user.name}</p>
              <p className="truncate text-caption text-ink-3">{user.roleLabel}</p>
            </div>
          )}
          <button type="button" onClick={onSignOut} aria-label="Sign out" title="Sign out" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink">
            <LogOut size={17} strokeWidth={1.75} />
          </button>
        </div>
        {!collapsed && (
          <p className="mt-3 flex items-center gap-1.5 text-caption text-ink-3">
            <LogoMark size={16} />
            Powered by Nizamo
          </p>
        )}
      </div>
    </div>
  )
}

export default function AppShell({ brand, nav, user, sessionLabel, onSignOut, activeHref, onNavigate, embedded = false, children }) {
  const pathname = usePathname()
  const active = activeHref ?? pathname
  const [collapsedPref, setCollapsedPref] = useStoredValue(STORAGE_KEY, '0')
  const collapsed = collapsedPref === '1'
  const [drawer, setDrawer] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const mod = useSyncExternalStore(noSubscribe, () => (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'), () => 'Ctrl')
  const drawerRef = useRef(null)

  // close the drawer after any navigation (adjusting state during render, not in an effect)
  const [drawerPath, setDrawerPath] = useState(active)
  if (drawerPath !== active) {
    setDrawerPath(active)
    setDrawer(false)
  }

  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // close the drawer on Escape
  useEffect(() => {
    if (!drawer) return
    const prev = document.body.style.overflow
    if (!embedded) document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && setDrawer(false)
    document.addEventListener('keydown', onKey)
    drawerRef.current?.querySelector('a, button')?.focus()
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [drawer, embedded])

  function toggleCollapsed() {
    setCollapsedPref(collapsed ? '0' : '1')
  }

  const select = onNavigate ? (e, href) => { e.preventDefault(); onNavigate(href) } : undefined

  const current = nav.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label }))).find((i) => i.href === active || active?.startsWith(i.href + '/'))

  const body = { brand, nav, user, activeHref: active, onSelect: select, onSignOut }

  return (
    <div style={{ '--sticky-top': embedded ? '0px' : '56px' }} className={clsx('relative flex bg-bg text-ink', embedded ? 'h-[780px] overflow-hidden rounded-card border border-line-strong' : 'min-h-screen')}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[400] focus:rounded-ctl focus:bg-espresso focus:px-3 focus:py-2 focus:text-cream">
        Skip to content
      </a>

      {/* desktop sidebar */}
      <aside
        className={clsx(
          'hidden shrink-0 border-r border-line bg-sidebar transition-[width] duration-200 lg:block',
          embedded ? 'h-full' : 'sticky top-0 h-screen',
          collapsed ? 'w-[var(--nav-w-collapsed)]' : 'w-[var(--nav-w)]'
        )}
      >
        <SidebarBody {...body} collapsed={collapsed} onToggle={toggleCollapsed} />
      </aside>

      {/* mobile drawer */}
      {drawer && (
        <div className={clsx('z-[250] lg:hidden', embedded ? 'absolute inset-0' : 'fixed inset-0')}>
          <div className="absolute inset-0 bg-espresso/40" onClick={() => setDrawer(false)} aria-hidden="true" />
          <div ref={drawerRef} role="dialog" aria-modal="true" aria-label="Menu" className="nz-slide-in absolute inset-y-0 left-0 w-[min(300px,86vw)] bg-sidebar shadow-pop">
            <button type="button" onClick={() => setDrawer(false)} aria-label="Close menu" className="absolute right-2 top-3.5 z-10 flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink">
              <X size={18} strokeWidth={1.75} />
            </button>
            <SidebarBody {...body} collapsed={false} drawer />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* top bar */}
        <div className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-line bg-bg px-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu" className="-ml-2 flex h-9 w-9 items-center justify-center rounded-md text-ink-2 hover:bg-sunken lg:hidden">
            <MenuIcon size={20} strokeWidth={1.75} />
          </button>
          <nav aria-label="Breadcrumb" className="min-w-0 flex-1 truncate text-body">
            {current ? (
              <>
                <span className="hidden text-ink-3 sm:inline">{current.group}</span>
                <span className="mx-2 hidden text-ink-3 sm:inline" aria-hidden="true">/</span>
                <span className="font-medium text-ink">{current.label}</span>
              </>
            ) : (
              <span className="font-medium text-ink">{brand.name}</span>
            )}
          </nav>

          {sessionLabel && <Badge tone="neutral" className="hidden sm:inline-flex">{sessionLabel}</Badge>}

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="flex h-9 items-center gap-2 rounded-ctl border border-line-strong bg-surface px-2.5 text-label text-ink-3 hover:border-ink-3 md:w-60"
          >
            <Search size={16} strokeWidth={1.75} aria-hidden="true" />
            <span className="hidden flex-1 text-left md:inline">Search</span>
            <kbd className="hidden rounded border border-line bg-sunken px-1.5 font-sans text-caption text-ink-3 md:inline">{mod} K</kbd>
          </button>

          <Menu
            label="Account"
            className="flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 hover:bg-sunken"
            trigger={
              <>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-caption font-semibold text-accent-text">{initials(user.name)}</span>
                <ChevronDown size={15} strokeWidth={1.75} className="text-ink-3" aria-hidden="true" />
              </>
            }
            header={
              <div>
                <p className="truncate text-body font-medium text-ink">{user.name}</p>
                {user.email && <p className="truncate text-caption text-ink-3">{user.email}</p>}
                <p className="mt-0.5 text-caption text-ink-3">{user.roleLabel}</p>
              </div>
            }
            items={[{ label: 'Sign out', onClick: onSignOut }]}
          />
        </div>

        <main id="main" tabIndex={-1} className={clsx('min-w-0 flex-1 outline-none', embedded && 'overflow-y-auto')}>
          <div className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>

      <Modal isOpen={searchOpen} onClose={() => setSearchOpen(false)} title="Search" description="Search is coming soon. It will find students by name, GR number or class.">
        <Input label="Search" placeholder="Try a student name or GR number" disabled />
      </Modal>
    </div>
  )
}
