import clsx from 'clsx'

export function FormGroup({ children, className }) {
  return <div className={clsx('flex flex-col gap-1.5 mb-3.5', className)}>{children}</div>
}

export function FormLabel({ children, required, className }) {
  return (
    <label className={clsx('text-[11px] font-semibold uppercase tracking-wide text-text-mid', className)}>
      {children} {required && <span className="text-terracotta">*</span>}
    </label>
  )
}

const baseInputClass = clsx(
  'px-[13px] py-[10px] border-[1.5px] border-[rgba(92,61,46,0.15)] rounded-[9px]',
  'bg-cream font-sans text-[13px] text-text-dark outline-none transition-all w-full',
  'focus:border-terracotta focus:bg-white focus:shadow-[0_0_0_3px_rgba(196,98,45,0.08)]',
  'disabled:opacity-60 disabled:cursor-not-allowed'
)

export function Input({ className, ...props }) {
  return <input className={clsx(baseInputClass, className)} {...props} />
}

export function Select({ className, children, ...props }) {
  return (
    <select className={clsx(baseInputClass, className)} {...props}>
      {children}
    </select>
  )
}

export function Textarea({ className, ...props }) {
  return <textarea className={clsx(baseInputClass, 'resize-none', className)} {...props} />
}
