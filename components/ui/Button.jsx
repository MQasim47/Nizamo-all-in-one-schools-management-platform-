import Link from 'next/link'
import clsx from 'clsx'
import { LoaderCircle } from 'lucide-react'

const VARIANTS = {
  primary: 'bg-accent-strong text-white hover:bg-[#9F4A1A] active:bg-[#8F4217] shadow-xs',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-sunken active:bg-[#E5DCCB]',
  ghost: 'bg-transparent text-ink-2 hover:bg-sunken hover:text-ink active:bg-[#E5DCCB]',
  danger: 'bg-bad text-white hover:bg-[#862A22] active:bg-[#74231C] shadow-xs',
}

const SIZES = {
  sm: 'h-8 px-3 text-label gap-1.5',
  md: 'h-10 px-4 text-body gap-2',
  lg: 'h-12 px-6 text-lead gap-2',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon: LeftIcon,
  href,
  className,
  disabled,
  type = 'button',
  ...props
}) {
  const cls = clsx(
    'inline-flex shrink-0 items-center justify-center rounded-ctl font-medium whitespace-nowrap transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className
  )
  const icon = loading ? (
    <LoaderCircle size={16} strokeWidth={1.75} className="nz-spin" aria-hidden="true" />
  ) : LeftIcon ? (
    <LeftIcon size={16} strokeWidth={1.75} aria-hidden="true" />
  ) : null

  if (href && !disabled && !loading) {
    return (
      <Link href={href} className={cls} {...props}>
        {icon}
        {children}
      </Link>
    )
  }
  return (
    <button type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={cls} {...props}>
      {icon}
      {children}
    </button>
  )
}
