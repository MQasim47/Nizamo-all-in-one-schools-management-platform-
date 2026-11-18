'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

// Last-resort error screen (the root layout itself failed). Reports the error (scrubbed, and only
// when Sentry is configured) and offers a retry. Must render its own <html> and <body>.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#F5F0E8', color: '#2C1810', fontFamily: 'system-ui, sans-serif', padding: 16 }}>
        <main style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 600, fontSize: 28, margin: '0 0 12px' }}>Something went wrong</h1>
          <p style={{ margin: '0 0 8px', lineHeight: 1.5 }}>Please try again. If it keeps happening, contact your school admin.</p>
          <p lang="ur" dir="rtl" style={{ margin: '0 0 20px', lineHeight: 1.8 }}>کچھ غلط ہو گیا۔ براہ کرم دوبارہ کوشش کریں۔</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ background: '#C4622D', color: '#fff', border: 0, borderRadius: 8, padding: '10px 20px', fontSize: 15, cursor: 'pointer' }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
