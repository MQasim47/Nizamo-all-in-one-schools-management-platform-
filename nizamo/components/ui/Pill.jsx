import clsx from 'clsx'

const VARIANTS = {
  green:  'bg-[rgba(74,140,111,0.1)] text-school-green',
  red:    'bg-[rgba(192,57,43,0.08)] text-school-red',
  gold:   'bg-[rgba(212,168,83,0.12)] text-[#9A7420]',
  brown:  'bg-[rgba(92,61,46,0.08)] text-brown-light',
  terra:  'bg-[rgba(196,98,45,0.1)] text-terracotta',
}

export default function Pill({ children, variant = 'brown', className }) {
  return (
    <span
      className={clsx(
        'text-[10.5px] font-semibold px-[9px] py-[3px] rounded-[20px] whitespace-nowrap inline-block',
        VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

// Helper to map common statuses to pill variants
export function statusToPillVariant(status) {
  const map = {
    approved: 'green',
    active: 'green',
    present: 'green',
    pass: 'green',
    pending: 'gold',
    draft: 'brown',
    rejected: 'red',
    absent: 'red',
    fail: 'red',
    inactive: 'red',
    late: 'terra',
  }
  return map[status?.toLowerCase()] || 'brown'
}
