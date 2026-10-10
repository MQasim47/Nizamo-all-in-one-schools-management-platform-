'use client'

import { Suspense, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { signOut } from 'next-auth/react'

const MESSAGES = {
  inactive: 'Your account or school is no longer active. Please contact your school administrator.',
  'wrong-school': 'You were signed in to a different school. Please sign in again for this one.',
}

function SignedOut() {
  const reason = useSearchParams().get('reason')
  const message = MESSAGES[reason] || 'You have been signed out.'

  // Clears the session cookie (server components can't), then shows the message.
  useEffect(() => {
    signOut({ redirect: false })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-6">
      <div className="max-w-[420px] w-full bg-warm-white border border-[rgba(92,61,46,0.12)] rounded-xl p-8 text-center shadow-card">
        <h1 className="font-serif text-2xl text-text-dark mb-2">Signed out</h1>
        <p className="text-[13px] text-text-mid mb-6">{message}</p>
        <a
          href="/login"
          className="inline-block bg-espresso text-white rounded-[11px] px-5 py-3 text-sm font-semibold no-underline"
        >
          Go to sign in
        </a>
      </div>
    </div>
  )
}

export default function SignedOutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <SignedOut />
    </Suspense>
  )
}
