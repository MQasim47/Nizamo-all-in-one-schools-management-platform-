'use client'

import { Card } from '@/components/ui/Card'
import ErrorState from '@/components/ui/ErrorState'

// A page failed to load. Calm message, retry, no technical details (they could contain personal data).
export default function Error({ reset }) {
  return (
    <Card padding={false}>
      <ErrorState onRetry={reset} />
    </Card>
  )
}
