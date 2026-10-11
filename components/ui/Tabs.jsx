'use client'

import { useRef } from 'react'
import clsx from 'clsx'

// Controlled tabs with the WAI-ARIA keyboard model (Left/Right/Home/End).
// tabs: [{ id, label, count? }]. Render the panel with <TabPanel> using the same idBase.
export function Tabs({ tabs, value, onChange, label = 'Sections', idBase = 'tabs', className }) {
  const refs = useRef({})

  function onKeyDown(e) {
    const i = tabs.findIndex((t) => t.id === value)
    let next = null
    if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length]
    else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length]
    else if (e.key === 'Home') next = tabs[0]
    else if (e.key === 'End') next = tabs[tabs.length - 1]
    if (next) {
      e.preventDefault()
      onChange(next.id)
      refs.current[next.id]?.focus()
    }
  }

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className={clsx('flex gap-1 overflow-x-auto border-b border-line', className)}>
      {tabs.map((t) => {
        const active = t.id === value
        return (
          <button
            key={t.id}
            ref={(el) => { refs.current[t.id] = el }}
            role="tab"
            type="button"
            id={`${idBase}-${t.id}`}
            aria-selected={active}
            aria-controls={`${idBase}-${t.id}-panel`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={clsx(
              '-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-body font-medium transition-colors',
              active ? 'border-accent text-ink' : 'border-transparent text-ink-3 hover:text-ink'
            )}
          >
            {t.label}
            {t.count != null && <span className={clsx('rounded-full px-1.5 text-caption', active ? 'bg-accent-soft text-accent-text' : 'bg-sunken text-ink-3')}>{t.count}</span>}
          </button>
        )
      })}
    </div>
  )
}

export function TabPanel({ id, value, idBase = 'tabs', children, className }) {
  if (id !== value) return null
  return <div role="tabpanel" id={`${idBase}-${id}-panel`} aria-labelledby={`${idBase}-${id}`} tabIndex={0} className={className}>{children}</div>
}

export default Tabs
