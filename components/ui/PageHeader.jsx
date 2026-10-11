import clsx from 'clsx'

// The page title is where a serif heading appears (together with big numbers).
export default function PageHeader({ title, description, actions, className }) {
  return (
    <header className={clsx('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        <h1 className="font-serif text-title text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-body text-ink-3">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
