'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import clsx from 'clsx'

// Dropdown menu. Positioned with `fixed` from the trigger's rectangle so it is never clipped by a
// scrolling table or card. Keyboard: Enter/Space/ArrowDown opens, arrows move, Escape closes and
// returns focus to the trigger.
// items: [{ label, onClick?, href?, danger?, disabled? }]; `header` is an optional non-interactive block.
export default function Menu({ trigger, items, header, label = 'Menu', align = 'end', className }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btn = useRef(null)
  const list = useRef(null)
  const id = useId()

  function toggle() {
    if (open) return setOpen(false)
    const r = btn.current.getBoundingClientRect()
    const width = 224
    const left = align === 'end' ? Math.max(8, Math.min(r.right - width, window.innerWidth - width - 8)) : Math.max(8, Math.min(r.left, window.innerWidth - width - 8))
    setPos({ top: r.bottom + 6, left })
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    list.current?.querySelector('[role="menuitem"]:not([aria-disabled="true"])')?.focus()
    const close = () => setOpen(false)
    const onDown = (e) => { if (!list.current?.contains(e.target) && !btn.current?.contains(e.target)) close() }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  function onListKey(e) {
    const els = [...list.current.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')]
    const i = els.indexOf(document.activeElement)
    if (e.key === 'ArrowDown') { e.preventDefault(); els[(i + 1) % els.length]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); els[(i - 1 + els.length) % els.length]?.focus() }
    else if (e.key === 'Home') { e.preventDefault(); els[0]?.focus() }
    else if (e.key === 'End') { e.preventDefault(); els[els.length - 1]?.focus() }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); btn.current?.focus() }
    else if (e.key === 'Tab') setOpen(false)
  }

  const itemCls = (it) =>
    clsx(
      'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-body outline-none transition-colors duration-150 ease-out',
      it.disabled ? 'cursor-not-allowed text-ink-3' : it.danger ? 'text-bad hover:bg-bad-soft focus:bg-bad-soft' : 'text-ink hover:bg-sunken focus:bg-sunken'
    )

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={typeof trigger === 'string' ? undefined : label}
        onClick={toggle}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); toggle() } }}
        className={className}
      >
        {trigger}
      </button>
      {open && (
        <div
          ref={list}
          id={id}
          role="menu"
          aria-label={label}
          onKeyDown={onListKey}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 224 }}
          className="nz-pop z-[300] rounded-card border border-line bg-surface p-1.5 shadow-pop"
        >
          {header && <div className="border-b border-line px-2.5 pb-2 pt-1.5">{header}</div>}
          {items.map((it, i) => {
            const common = { role: 'menuitem', tabIndex: -1, 'aria-disabled': it.disabled || undefined, className: itemCls(it) }
            const done = () => setOpen(false)
            return it.href && !it.disabled ? (
              <Link key={i} href={it.href} onClick={done} {...common}>{it.label}</Link>
            ) : (
              <button
                key={i}
                type="button"
                onClick={() => { if (it.disabled) return; done(); it.onClick?.() }}
                {...common}
              >
                {it.label}
              </button>
            )
          })}
        </div>
      )}
    </>
  )
}
