'use client'

import { useId, useState } from 'react'
import clsx from 'clsx'
import { Eye, EyeOff, CircleAlert } from 'lucide-react'

// Label above the control, optional hint, error text with an icon (never colour alone), and the
// ids that connect them for screen readers.
function Field({ id, label, hint, error, required, children, className }) {
  return (
    <div className={clsx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-label font-medium text-ink">
          {label}
          {required && <span className="ml-0.5 text-accent-text" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-err`} className="flex items-start gap-1.5 text-label text-bad" role="alert">
          <CircleAlert size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-label text-ink-3">{hint}</p>
      ) : null}
    </div>
  )
}

const control = (error) =>
  clsx(
    'w-full rounded-ctl border bg-surface px-3 text-body text-ink placeholder:text-ink-3 transition-[border-color,box-shadow,background-color] duration-150 ease-out',
    'hover:border-ink-3 focus:border-accent focus:outline-none focus:ring-[3px] focus:ring-accent-soft',
    'disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-3',
    error ? 'border-bad' : 'border-line-strong'
  )

function describedBy(id, error, hint) {
  return error ? `${id}-err` : hint ? `${id}-hint` : undefined
}

export function Input({ label, hint, error, required, className, id: idProp, ...props }) {
  const auto = useId()
  const id = idProp || auto
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <input id={id} required={required} aria-invalid={!!error || undefined} aria-describedby={describedBy(id, error, hint)} className={clsx(control(error), 'h-10')} {...props} />
    </Field>
  )
}

export function PasswordInput({ label = 'Password', hint, error, required, className, id: idProp, ...props }) {
  const auto = useId()
  const id = idProp || auto
  const [show, setShow] = useState(false)
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <div className="relative">
        <input
          id={id}
          type={show ? 'text' : 'password'}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={clsx(control(error), 'h-10 pr-11')}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:bg-sunken hover:text-ink"
        >
          {show ? <EyeOff size={16} strokeWidth={1.75} /> : <Eye size={16} strokeWidth={1.75} />}
        </button>
      </div>
    </Field>
  )
}

export function Select({ label, hint, error, required, className, id: idProp, children, ...props }) {
  const auto = useId()
  const id = idProp || auto
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <select id={id} required={required} aria-invalid={!!error || undefined} aria-describedby={describedBy(id, error, hint)} className={clsx(control(error), 'h-10')} {...props}>
        {children}
      </select>
    </Field>
  )
}

export function Textarea({ label, hint, error, required, className, id: idProp, rows = 3, ...props }) {
  const auto = useId()
  const id = idProp || auto
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required} className={className}>
      <textarea id={id} rows={rows} required={required} aria-invalid={!!error || undefined} aria-describedby={describedBy(id, error, hint)} className={clsx(control(error), 'resize-y py-2')} {...props} />
    </Field>
  )
}
