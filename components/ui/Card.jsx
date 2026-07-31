import clsx from 'clsx'

export function Card({ children, className, animate, ...props }) {
  return (
    <div
      className={clsx(
        'bg-warm-white border-[1.5px] border-[rgba(92,61,46,0.12)] rounded-lg p-5',
        animate && 'animate-fade-up',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }) {
  return (
    <div className={clsx('flex justify-between items-center mb-[18px]', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }) {
  return (
    <div className={clsx('font-serif text-[15px] text-text-dark', className)}>
      {children}
    </div>
  )
}

export function CardAction({ children, className, ...props }) {
  return (
    <a
      className={clsx(
        'text-xs text-terracotta cursor-pointer font-medium no-underline hover:underline',
        className
      )}
      {...props}
    >
      {children}
    </a>
  )
}
