import Link from 'next/link'
import clsx from 'clsx'
import { COLORS, markFor } from '@/lib/brand-mark.mjs'

// THE Nizamo logo. Geometry lives in lib/brand-mark.mjs (shared with the favicon and social image).
//
//   <LogoMark size={32} />                     mark only. size = height in px. < 48 uses the simplified drawing.
//   <Logo layout="horizontal" size="md" />     mark + wordmark (default)
//   <Logo layout="stacked" size="lg" />        mark above wordmark
//   variant: 'color' (default) | 'reverse' (cream, for espresso backgrounds) | 'mono' (one-colour espresso)
//   tagline: optional, e.g. "School Management" (off by default)
const PRESETS = { sm: 24, md: 32, lg: 48, xl: 72 }
const px = (size) => (typeof size === 'number' ? size : PRESETS[size] || PRESETS.md)

function palette(variant) {
  if (variant === 'reverse') return { e: COLORS.cream, t: COLORS.terracotta, text: COLORS.cream, dot: COLORS.terracotta }
  if (variant === 'mono') return { e: COLORS.espresso, t: COLORS.espresso, text: COLORS.espresso, dot: COLORS.espresso }
  return { e: COLORS.espresso, t: COLORS.terracotta, text: COLORS.espresso, dot: COLORS.terracotta }
}

export function LogoMark({ size = 32, variant = 'color', simplified, className, title }) {
  const h = px(size)
  const m = markFor(h, simplified)
  const p = palette(variant)
  const w = (h * m.width) / m.height
  return (
    <svg
      width={w}
      height={h}
      viewBox={m.viewBox}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      className={clsx('shrink-0', className)}
    >
      {m.parts.map((part, i) => (
        <path key={i} d={part.d} fill={p[part.c]} />
      ))}
      {/* pillar with its slots cut out (transparent), so it works on any background */}
      <path d={m.pillar + m.slots.join('')} fill={p.e} fillRule="evenodd" />
    </svg>
  )
}

// "Nizamo" in Playfair Display with a terracotta dot on the i (dotless i + drawn dot).
export function Wordmark({ fontSize = 24, variant = 'color', className }) {
  const p = palette(variant)
  return (
    <span
      aria-hidden="true"
      className={clsx('font-serif leading-none', className)}
      style={{ fontSize, fontWeight: 600, letterSpacing: '-0.01em', color: p.text }}
    >
      N
      <span style={{ position: 'relative', display: 'inline-block' }}>
        ı
        <span
          style={{
            position: 'absolute',
            left: '50%',
            top: '0.18em',
            width: '0.17em',
            height: '0.17em',
            transform: 'translateX(-50%)',
            borderRadius: '9999px',
            background: p.dot,
          }}
        />
      </span>
      zamo
    </span>
  )
}

export default function Logo({ layout = 'horizontal', size = 'md', variant = 'color', tagline, href, className }) {
  const h = px(size)
  const stacked = layout === 'stacked'
  const markH = stacked ? h : h
  const font = stacked ? h * 0.37 : h * 0.62
  const p = palette(variant)

  const inner =
    layout === 'mark' ? (
      <LogoMark size={markH} variant={variant} />
    ) : (
      <>
        <LogoMark size={markH} variant={variant} />
        <span className={clsx('flex flex-col', stacked ? 'items-center' : 'items-start')}>
          <Wordmark fontSize={font} variant={variant} />
          {tagline && (
            <span aria-hidden="true" className="mt-1 uppercase" style={{ fontSize: Math.max(9, font * 0.3), letterSpacing: '0.14em', color: p.text, opacity: 0.8, fontWeight: 500 }}>
              {tagline}
            </span>
          )}
        </span>
      </>
    )

  const cls = clsx('inline-flex', stacked ? 'flex-col items-center' : 'items-center', className)
  const style = { gap: stacked ? h * 0.2 : h * 0.3 }
  return href ? (
    <Link href={href} className={cls} style={style} aria-label="Nizamo">
      {inner}
    </Link>
  ) : (
    <span className={cls} style={style} role="img" aria-label="Nizamo">
      {inner}
    </span>
  )
}
