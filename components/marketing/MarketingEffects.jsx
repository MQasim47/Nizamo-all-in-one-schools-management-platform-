'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Two small progressive enhancements, nothing else:
//  1. the nav gets a background after scrolling;
//  2. sections fade in as they reach the viewport.
// Content is visible by default: the hidden state only exists while this effect is live
// (`data-reveal` on the root) and is removed again on cleanup. This component sits in a layout
// that survives client-side navigation, so it re-initialises on every route change (pathname).
// A scroll sweep (not an IntersectionObserver) decides what to show: anything at or above the
// bottom edge of the viewport is revealed, so fast scrolling, Page End and #hash jumps can never
// leave a section hidden.
export default function MarketingEffects() {
  const pathname = usePathname()

  useEffect(() => {
    const root = document.querySelector('.nz-home')
    const nav = document.querySelector('[data-nz-nav]')
    if (!root) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let pending = reduce ? [] : [...root.querySelectorAll('.reveal')]
    let frame = 0

    const sweep = () => {
      frame = 0
      nav?.classList.toggle('scrolled', window.scrollY > 24)
      if (!pending.length) return
      // Content near the very end of the page may never rise above the edge: at the bottom, show all.
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2
      const edge = atEnd ? Infinity : window.innerHeight * 0.92
      pending = pending.filter((el) => {
        if (el.getBoundingClientRect().top < edge) { el.classList.add('in'); return false }
        return true
      })
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(sweep) }

    sweep() // show what is already on screen before the hidden state is switched on
    if (pending.length) root.setAttribute('data-reveal', '')
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    window.addEventListener('hashchange', schedule)

    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('hashchange', schedule)
      if (frame) cancelAnimationFrame(frame)
      root.removeAttribute('data-reveal')
    }
  }, [pathname])

  return null
}
