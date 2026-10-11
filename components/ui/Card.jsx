import clsx from 'clsx'

// A card is a quiet surface: hairline border, almost no shadow. Use padding={false} for tables.
export function Card({ children, className, padding = true, as: Tag = 'section', ...props }) {
  return (
    <Tag className={clsx('rounded-card border border-line bg-surface shadow-xs', padding && 'p-5', className)} {...props}>
      {children}
    </Tag>
  )
}

export function CardHeader({ title, description, action, className }) {
  return (
    <div className={clsx('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        <h2 className="text-lead font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-label text-ink-3">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
