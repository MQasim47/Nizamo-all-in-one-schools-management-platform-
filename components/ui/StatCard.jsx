import Link from 'next/link'
import clsx from 'clsx'
import { ChevronRight } from 'lucide-react'
import { Card } from './Card'

// Accent discipline: numbers and bars are espresso. Terracotta (`action`) is reserved for
// something that needs the reader to DO something ("5 classes not marked", overdue fees).

// One number with context. The value is the only large serif text on the card.
export function StatCard({ label, value, detail, href, progress, action = false, className }) {
  const body = (
    <>
      <p className="text-label font-medium text-ink-3">{label}</p>
      <p className={clsx('mt-2 font-serif text-stat lining-nums tabular-nums', action ? 'text-accent-text' : 'text-ink')}>{value}</p>
      {typeof progress === 'number' && <Progress value={progress} label={label} action={action} className="mt-3" />}
      {detail && <p className="mt-2 text-label text-ink-3">{detail}</p>}
    </>
  )
  return href ? (
    <Link href={href} className={clsx('block rounded-card border border-line bg-surface p-5 shadow-xs transition-colors duration-150 ease-out hover:border-line-strong hover:bg-bg', className)}>
      {body}
    </Link>
  ) : (
    <Card className={className}>{body}</Card>
  )
}

function Progress({ value, label, action, className }) {
  return (
    <div className={clsx('h-1.5 overflow-hidden rounded-full bg-sunken', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={clsx('h-full rounded-full', action ? 'bg-accent' : 'bg-ink')} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

// "Today at a glance": one card, one row per fact, each row a link to where you act on it.
// This reads as a briefing, not a wall of identical boxes.
// items: [{ label, value, detail, href?, action?, progress? }]
export function GlanceList({ items }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((it) => {
        const inner = (
          <>
            <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
              <p className="text-body font-medium text-ink">{it.label}</p>
              {it.detail && <p className="mt-0.5 text-label text-ink-3">{it.detail}</p>}
              {typeof it.progress === 'number' && <Progress value={it.progress} label={it.label} action={it.action} className="mt-2 max-w-[240px]" />}
            </div>
            <p className={clsx('order-first shrink-0 basis-full text-left font-serif text-[24px] leading-none lining-nums tabular-nums sm:order-none sm:basis-auto sm:text-right', it.action ? 'text-accent-text' : 'text-ink')}>{it.value}</p>
            {it.href && <ChevronRight size={16} strokeWidth={1.75} className="hidden shrink-0 text-ink-3 sm:block" aria-hidden="true" />}
          </>
        )
        const cls = 'flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 sm:flex-nowrap'
        return (
          <li key={it.label}>
            {it.href ? (
              <Link href={it.href} className={clsx(cls, 'transition-colors duration-150 ease-out hover:bg-bg')}>{inner}</Link>
            ) : (
              <div className={cls}>{inner}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default StatCard
