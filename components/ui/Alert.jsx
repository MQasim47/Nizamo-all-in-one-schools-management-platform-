import clsx from 'clsx'
import { CircleCheck, CircleAlert, TriangleAlert, Info } from 'lucide-react'

const TONES = {
  info: { box: 'bg-sunken border-line-strong text-ink', icon: Info, iconCls: 'text-ink-2' },
  success: { box: 'bg-ok-soft border-[#BCD3C2] text-ink', icon: CircleCheck, iconCls: 'text-ok' },
  warning: { box: 'bg-warn-soft border-[#E2CF9F] text-ink', icon: TriangleAlert, iconCls: 'text-warn' },
  danger: { box: 'bg-bad-soft border-[#E3B9B2] text-ink', icon: CircleAlert, iconCls: 'text-bad' },
}

export default function Alert({ tone = 'info', title, children, action, className }) {
  const t = TONES[tone] || TONES.info
  const Icon = t.icon
  return (
    <div role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'} className={clsx('flex gap-3 rounded-card border p-3.5 text-body', t.box, className)}>
      <Icon size={18} strokeWidth={1.75} className={clsx('mt-0.5 shrink-0', t.iconCls)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={clsx(title && 'mt-0.5 text-ink-2')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
