import Link from 'next/link'
import clsx from 'clsx'
import { ChevronRight } from 'lucide-react'
import { Card } from './Card'

const BAR = { neutral: 'bg-ink-3', accent: 'bg-accent', success: 'bg-ok', warning: 'bg-warn', danger: 'bg-bad' }

// One number with context. The value is the only large serif text on the card.
export function StatCard({ label, value, detail, href, progress, tone = 'neutral', className }) {
  const body = (
    <>
      <p className="text-label font-medium text-ink-3">{label}</p>
      <p className="mt-2 font-serif text-stat text-ink lining-nums tabular-nums">{value}</p>
      {typeof progress === 'number' && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
          <div className={clsx('h-full rounded-full', BAR[tone])} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      )}
      {detail && <p className="mt-2 text-label text-ink-3">{detail}</p>}
    </>
  )
  return href ? (
    <Link href={href} className={clsx('block rounded-card border border-line bg-surface p-5 shadow-xs transition-colors hover:border-line-strong hover:bg-bg', className)}>
      {body}
    </Link>
  ) : (
    <Card className={className}>{body}</Card>
  )
}

// "Today at a glance": one card, one row per fact, each row a link to where you act on it.
// This reads as a briefing, not a wall of identical boxes.
// items: [{ label, value, detail, href, tone, progress }]
export function GlanceList({ items }) {
  return (
    <ul className="divide-y divide-line">
      {items.map((it) => {
        const inner = (
          <>
            <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
              <p className="text-body font-medium text-ink">{it.label}</p>
              {it.detail && <p className="mt-0.5 text-label text-ink-3">{it.detail}</p>}
              {typeof it.progress === 'number' && (
                <div className="mt-2 h-1.5 max-w-[240px] overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={Math.round(it.progress)} aria-valuemin={0} aria-valuemax={100} aria-label={it.label}>
                  <div className={clsx('h-full rounded-full', BAR[it.tone || 'accent'])} style={{ width: `${Math.max(0, Math.min(100, it.progress))}%` }} />
                </div>
              )}
            </div>
            <p className={clsx('order-first shrink-0 basis-full text-left sm:order-none sm:basis-auto sm:text-right font-serif text-[24px] leading-none lining-nums tabular-nums', it.tone === 'danger' ? 'text-bad' : it.tone === 'warning' ? 'text-warn' : 'text-ink')}>{it.value}</p>
            {it.href && <ChevronRight size={16} strokeWidth={1.75} className="hidden shrink-0 text-ink-3 sm:block" aria-hidden="true" />}
          </>
        )
        const cls = 'flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 sm:flex-nowrap'
        return (
          <li key={it.label}>
            {it.href ? (
              <Link href={it.href} className={clsx(cls, 'transition-colors hover:bg-bg')}>{inner}</Link>
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
