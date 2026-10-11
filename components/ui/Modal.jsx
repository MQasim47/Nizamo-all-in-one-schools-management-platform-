'use client'

import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { X } from 'lucide-react'

const WIDTHS = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl' }
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Accessible dialog: labelled by its title, Escape closes, Tab stays inside, focus returns to the
// button that opened it, page scroll is locked while open.
export default function Modal({ isOpen, onClose, title, description, children, actions, size = 'md' }) {
  const titleId = useId()
  const descId = useId()
  const panel = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const opener = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const first = panel.current?.querySelector(FOCUSABLE)
    ;(first || panel.current)?.focus()

    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); onClose?.() }
      if (e.key !== 'Tab' || !panel.current) return
      const items = [...panel.current.querySelectorAll(FOCUSABLE)]
      if (!items.length) { e.preventDefault(); return }
      const a = items[0], z = items[items.length - 1]
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      opener?.focus?.()
    }
  }, [isOpen, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center bg-espresso/40 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={clsx('nz-pop w-full rounded-t-card bg-surface shadow-pop outline-none sm:rounded-card', WIDTHS[size])}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5">
          <div className="min-w-0">
            {title && <h2 id={titleId} className="text-heading font-semibold text-ink">{title}</h2>}
            {description && <p id={descId} className="mt-1 text-body text-ink-3">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        {children && <div className="px-6 py-4 text-body text-ink-2">{children}</div>}
        {actions && <div className="flex flex-col-reverse gap-2 border-t border-line px-6 py-4 sm:flex-row sm:justify-end">{actions}</div>}
      </div>
    </div>,
    document.body
  )
}
