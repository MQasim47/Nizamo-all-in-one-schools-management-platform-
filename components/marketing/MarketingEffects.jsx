'use client'

import { useEffect } from 'react'

// Two small progressive enhancements, nothing else:
//  1. the nav gets a background after scrolling;
//  2. sections fade in as they enter the viewport.
// Without JavaScript (or with reduced motion) all content is simply visible.
export default function MarketingEffects() {
  useEffect(() => {
    const root = document.querySelector('.nz-home')
    const nav = document.querySelector('[data-nz-nav]')
    if (!root) return

    const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let io
    if (!reduce && 'IntersectionObserver' in window) {
      const items = [...root.querySelectorAll('.reveal')]
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              e.target.classList.add('in')
              io.unobserve(e.target)
            }
          }
        },
        { threshold: 0.12 }
      )
      // Anything already on screen is shown immediately, so enabling the effect never flashes.
      for (const el of items) {
        const r = el.getBoundingClientRect()
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in')
        else io.observe(el)
      }
      root.setAttribute('data-reveal', '')
    }

    return () => {
      window.removeEventListener('scroll', onScroll)
      io?.disconnect()
    }
  }, [])

  return null
}
