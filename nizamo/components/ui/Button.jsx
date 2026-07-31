import clsx from 'clsx'

const VARIANTS = {
  primary: 'bg-espresso text-white hover:bg-brown-mid',
  terra: 'bg-terracotta text-white hover:bg-terra-light',
  outline: 'bg-transparent border-[1.5px] border-[rgba(92,61,46,0.15)] text-text-mid hover:bg-sand',
  green: 'bg-school-green text-white hover:opacity-90',
  danger: 'bg-[rgba(192,57,43,0.08)] text-school-red border-[1.5px] border-[rgba(192,57,43,0.2)] hover:bg-school-red hover:text-white',
}

const SIZES = {
  default: 'px-[18px] py-[9px] text-[13px]',
  sm: 'px-[13px] py-[6px] text-[12px] rounded-[7px]',
  lg: 'px-[30px] py-[14px] text-[14px]',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'default',
  className,
  disabled,
  type = 'button',
  onClick,
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-[9px] font-semibold font-sans transition-all duration-200 cursor-pointer border-none',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        size === 'default' && 'hover:-translate-y-px',
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
