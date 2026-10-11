import clsx from 'clsx'

const TONES = {
  neutral: 'bg-sunken text-ink-2',
  accent: 'bg-accent-soft text-accent-text',
  success: 'bg-ok-soft text-ok',
  warning: 'bg-warn-soft text-warn',
  danger: 'bg-bad-soft text-bad',
}
const DOTS = { neutral: 'bg-ink-3', accent: 'bg-accent', success: 'bg-ok', warning: 'bg-warn', danger: 'bg-bad' }

// Status badge. The text always says the status; the dot is decoration, never the only signal.
export default function Badge({ children, tone = 'neutral', dot = false, className }) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-caption font-medium', TONES[tone], className)}>
      {dot && <span className={clsx('h-1.5 w-1.5 rounded-full', DOTS[tone])} aria-hidden="true" />}
      {children}
    </span>
  )
}
export { Badge as Pill }

const STATUS_TONE = {
  approved: 'success', active: 'success', present: 'success', paid: 'success', pass: 'success',
  pending: 'warning', partial: 'warning', late: 'warning', new: 'accent', contacted: 'accent',
  rejected: 'danger', absent: 'danger', fail: 'danger', inactive: 'danger', overdue: 'danger', suspended: 'danger',
  draft: 'neutral',
}
export function statusTone(status) {
  return STATUS_TONE[String(status || '').toLowerCase()] || 'neutral'
}
