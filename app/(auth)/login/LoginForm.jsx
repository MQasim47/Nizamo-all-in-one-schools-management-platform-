'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import LoginView from '@/components/auth/LoginView'

// Auth logic only (NextAuth credentials sign-in, unchanged); all of the look lives in LoginView.
// subdomain/schoolName/schoolFound are resolved on the server (login/page.jsx).
// `demo` is an empty list unless NEXT_PUBLIC_DEMO_MODE=true on the server.
export default function LoginForm({ subdomain, schoolName, logoUrl, schoolFound, demo, rootDomain }) {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null) // null | 'invalid' | 'locked'

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn('credentials', {
      email,
      password,
      subdomain,
      redirect: false,
    })

    if (result?.error === 'LOCKED') {
      setLoading(false)
      setError('locked')
    } else if (result?.error) {
      setLoading(false)
      setError('invalid')
    } else {
      // keep the button busy while the dashboard loads
      router.push('/school/dashboard')
      router.refresh()
    }
  }

  return (
    <LoginView
      schoolName={schoolName}
      logoUrl={logoUrl}
      addressLabel={subdomain && rootDomain ? `${subdomain}.${rootDomain}` : subdomain || undefined}
      schoolFound={schoolFound}
      notFoundHint={rootDomain ? `Please open the sign-in link your school gave you (it looks like yourschool.${rootDomain}), or ask your school for it.` : undefined}
      email={email}
      password={password}
      onEmail={setEmail}
      onPassword={setPassword}
      onSubmit={handleSubmit}
      loading={loading}
      error={error}
      demo={demo}
      onFillDemo={(a) => {
        setEmail(a.email)
        setPassword(a.password)
      }}
    />
  )
}
