'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import clsx from 'clsx'
import Button from './Button'

// Calm inline error with a retry. Never shows technical details (they could contain personal data).
//   onRetry: custom retry. Without it, "Try again" re-fetches the page's server data (router.refresh).
export default function ErrorState({ title = 'This could not be loaded', description = 'Something went wrong on our side. Your data is safe. Please try again.', onRetry, className }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function retry() {
    setBusy(true)
    try {
      if (onRetry) await onRetry()
      else router.refresh()
    } finally {
      setTimeout(() => setBusy(false), 600)
    }
  }

  return (
    <div role="alert" className={clsx('flex flex-col items-center px-6 py-10 text-center', className)}>
      <p className="text-lead font-semibold text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-body text-ink-3">{description}</p>
      <Button variant="secondary" size="sm" className="mt-4" loading={busy} onClick={retry}>
        Try again
      </Button>
    </div>
  )
}
