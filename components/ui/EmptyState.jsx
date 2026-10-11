import clsx from 'clsx'

// Illustration-free on purpose: one plain sentence about what goes here, one next step.
export default function EmptyState({ title, description, action, className }) {
  return (
    <div className={clsx('flex flex-col items-center px-6 py-10 text-center', className)}>
      <p className="text-lead font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-body text-ink-3">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
