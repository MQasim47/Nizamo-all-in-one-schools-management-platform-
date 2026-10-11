import Link from 'next/link'
import { Card, CardHeader } from '@/components/ui/Card'
import PageHeader from '@/components/ui/PageHeader'
import EmptyState from '@/components/ui/EmptyState'
import ErrorState from '@/components/ui/ErrorState'
import { GlanceList } from '@/components/ui/StatCard'
import SetupChecklist from '@/components/dashboard/SetupChecklist'
import { formatHijri, formatLongPk, greetingPk } from '@/lib/utils/dates.mjs'

// The principal's home. Presentational: the page passes real data (or nothing, for a new school).
//   glance:    [{ label, value, detail, href?, action?, progress? }]   facts for today ([] = nothing yet)
//   actions:   [{ label, href, icon }]                                 ONLY built modules ([] hides the block)
//   activity:  [{ id, text, when }]                                    plain-language audit entries
//   checklist: [{ id, label, done, href?, comingSoon? }]               "Set up your school" (hidden when complete/omitted)
//   glanceFailed / activityFailed: show a calm error with retry instead of an empty state
//   onAction:  optional click handler (the /design preview uses it instead of links)
export default function PrincipalHome({
  name,
  glance = [],
  actions = [],
  activity = [],
  checklist,
  glanceFailed = false,
  activityFailed = false,
  showActivity = true,
  onAction,
  hijriOffset,
}) {
  const now = new Date()
  const showChecklist = checklist && !checklist.every((s) => s.done)
  return (
    <div className="space-y-8">
      <PageHeader
        title={
          <>
            <span suppressHydrationWarning>{greetingPk(now)}</span>, {name}
          </>
        }
        description={
          <span suppressHydrationWarning>
            {formatLongPk(now)} <span className="mx-1.5 text-line-strong" aria-hidden="true">|</span>
            <span className="text-ink-3">{formatHijri(now, hijriOffset)} AH</span>
          </span>
        }
      />

      {actions.length > 0 && (
        <section aria-label="Quick actions" className="flex flex-wrap gap-2">
          {actions.map((a) => {
            const Icon = a.icon
            const cls = 'inline-flex h-10 items-center gap-2 rounded-ctl border border-line-strong bg-surface px-3.5 text-body font-medium text-ink shadow-xs transition-colors duration-150 ease-out hover:bg-sunken active:translate-y-px'
            const inner = (
              <>
                <Icon size={16} strokeWidth={1.75} className="text-ink-2" aria-hidden="true" />
                {a.label}
              </>
            )
            return a.href && !onAction ? (
              <Link key={a.label} href={a.href} className={cls}>{inner}</Link>
            ) : (
              <button key={a.label} type="button" onClick={() => onAction?.(a)} className={cls}>{inner}</button>
            )
          })}
        </section>
      )}

      {showChecklist && <SetupChecklist steps={checklist} />}

      <div className={showActivity ? 'grid gap-6 lg:grid-cols-5' : ''}>
        <Card padding={false} className={showActivity ? 'lg:col-span-3' : ''}>
          <div className="border-b border-line px-5 py-4">
            <CardHeader title="Today at a glance" description="What needs your attention today." />
          </div>
          {glanceFailed ? (
            <ErrorState title="Today's numbers could not be loaded" />
          ) : glance.length ? (
            <GlanceList items={glance} />
          ) : (
            <EmptyState title="Nothing to show yet" description="Once students are added and attendance is marked, today's numbers will appear here." />
          )}
        </Card>

        {showActivity && (
          <Card padding={false} className="lg:col-span-2">
            <div className="border-b border-line px-5 py-4">
              <CardHeader title="Recent activity" description="Changes made by your team." />
            </div>
            {activityFailed ? (
              <ErrorState title="Activity could not be loaded" />
            ) : activity.length ? (
              <ol className="divide-y divide-line">
                {activity.map((a) => (
                  <li key={a.id} className="px-5 py-3.5">
                    <p className="text-body text-ink">{a.text}</p>
                    <p className="mt-0.5 text-caption text-ink-3">{a.when}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState title="No activity yet" description="When your team adds students, marks attendance or enters results, you will see it here." />
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
