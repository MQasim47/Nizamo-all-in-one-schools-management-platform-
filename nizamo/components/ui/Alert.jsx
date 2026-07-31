import clsx from 'clsx'

const VARIANTS = {
  success: 'bg-[rgba(74,140,111,0.1)] border-[rgba(74,140,111,0.2)] text-school-green',
  error:   'bg-[rgba(192,57,43,0.08)] border-[rgba(192,57,43,0.2)] text-school-red',
  info:    'bg-[rgba(212,168,83,0.1)] border-[rgba(212,168,83,0.2)] text-[#9A7420]',
}

const ICONS = {
  success: '✓',
  error: '⚠',
  info: 'ℹ',
}

export default function Alert({ type = 'info', children, className }) {
  return (
    <div
      className={clsx(
        'px-[15px] py-[11px] rounded-[9px] text-[13px] mb-4 flex items-center gap-2 border',
        VARIANTS[type],
        className
      )}
    >
      <span>{ICONS[type]}</span>
      <span>{children}</span>
    </div>
  )
}
