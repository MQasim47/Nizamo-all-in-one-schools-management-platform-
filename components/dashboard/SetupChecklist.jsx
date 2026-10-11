import Link from 'next/link'
import { Check } from 'lucide-react'
import clsx from 'clsx'
import { Card, CardHeader } from '@/components/ui/Card'
import Badge from '@/components/ui/Pill'

// "Set up your school": session -> classes -> subjects -> staff -> students, with progress.
//   steps: [{ id, label, done, href?, comingSoon? }]
// A step whose module does not exist yet shows "Coming soon" instead of a dead link.
export default function SetupChecklist({ steps }) {
  const doneCount = steps.filter((s) => s.done).length
  const pct = Math.round((doneCount / steps.length) * 100)
  return (
    <Card padding={false}>
      <div className="px-5 pb-4 pt-5">
        <CardHeader
          title="Set up your school"
          description="Five steps to get Nizamo ready for your teachers and parents."
          action={<span className="text-label font-medium tabular-nums text-ink-2">{doneCount} of {steps.length} done</span>}
        />
        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Setup progress">
          <div className="h-full rounded-full bg-ink transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <ol className="divide-y divide-line border-t border-line">
        {steps.map((s, i) => {
          const row = (
            <>
              <span
                aria-hidden="true"
                className={clsx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-caption font-semibold tabular-nums', s.done ? 'border-ink bg-ink text-cream' : 'border-line-strong text-ink-3')}
              >
                {s.done ? <Check size={14} strokeWidth={2.25} /> : i + 1}
              </span>
              <span className={clsx('flex-1 text-body', s.done ? 'text-ink-3 line-through decoration-line-strong' : 'font-medium text-ink')}>{s.label}</span>
              {s.done ? <span className="text-label text-ink-3">Done</span> : s.comingSoon ? <Badge>Coming soon</Badge> : <span className="text-label font-medium text-accent-text">Start</span>}
            </>
          )
          const cls = 'flex items-center gap-3 px-5 py-3.5'
          return (
            <li key={s.id}>
              {!s.done && s.href ? (
                <Link href={s.href} className={clsx(cls, 'transition-colors duration-150 ease-out hover:bg-bg')}>{row}</Link>
              ) : (
                <div className={cls}>{row}</div>
              )}
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
