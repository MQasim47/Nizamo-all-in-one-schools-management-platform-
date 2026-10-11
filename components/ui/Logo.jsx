import Link from 'next/link'
import clsx from 'clsx'

// THE one place the Nizamo logo lives. Today: an "N" monogram + wordmark placeholder.
// When the real SVG logo exists, replace the body of <LogoMark/> (and, if it includes the name,
// drop the wordmark) here; every page already uses this component.
const SIZES = {
  sm: { box: 'h-6 w-6 rounded-md text-[14px]', word: 'text-[15px]', gap: 'gap-2' },
  md: { box: 'h-8 w-8 rounded-lg text-[18px]', word: 'text-[18px]', gap: 'gap-2.5' },
  lg: { box: 'h-11 w-11 rounded-xl text-[26px]', word: 'text-[24px]', gap: 'gap-3' },
}

export function LogoMark({ size = 'md', tone = 'dark', className }) {
  const s = SIZES[size]
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'relative inline-flex shrink-0 items-center justify-center font-serif leading-none',
        s.box,
        tone === 'dark' ? 'bg-espresso text-cream' : 'bg-cream text-espresso',
        className
      )}
    >
      N
      <span className="absolute bottom-[18%] left-1/2 h-[2px] w-[34%] -translate-x-1/2 rounded-full bg-accent" />
    </span>
  )
}

export default function Logo({ size = 'md', tone = 'dark', wordmark = true, href, className }) {
  const s = SIZES[size]
  const inner = (
    <>
      <LogoMark size={size} tone={tone} />
      {wordmark && (
        <span className={clsx('font-serif leading-none', s.word, tone === 'dark' ? 'text-ink' : 'text-cream')}>Nizamo</span>
      )}
    </>
  )
  const cls = clsx('inline-flex items-center', s.gap, className)
  return href ? (
    <Link href={href} className={cls} aria-label="Nizamo">
      {inner}
    </Link>
  ) : (
    <span className={cls} role="img" aria-label="Nizamo">
      {inner}
    </span>
  )
}
