'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const EMPTY = { schoolName: '', subdomain: '', principalName: '', email: '', phone: '', password: '', website: '' }
const SUB_RE = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/

const AVAIL_TEXT = {
  invalid: 'Use 3–30 letters, numbers or hyphens',
  reserved: 'This address is reserved. Please choose another.',
  taken: 'This address is already taken',
  rate_limited: 'Checking too fast. Please wait a moment.',
}

export default function RegisterForm({ rootDomain }) {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [avail, setAvail] = useState({ state: 'idle' }) // idle | checking | ok | bad
  const [accepted, setAccepted] = useState(false)
  const [status, setStatus] = useState('idle') // idle | sending | done | error | limited
  const [createdSub, setCreatedSub] = useState('')

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: k === 'subdomain' ? e.target.value.toLowerCase().trim() : e.target.value }))

  // Live availability: debounced, and stale answers are ignored.
  useEffect(() => {
    const sub = values.subdomain
    if (!sub) return setAvail({ state: 'idle' })
    if (!SUB_RE.test(sub)) return setAvail({ state: 'bad', reason: 'invalid' })
    setAvail({ state: 'checking' })
    let cancelled = false
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/schools/available?subdomain=${encodeURIComponent(sub)}`)
        const data = await res.json()
        if (cancelled) return
        setAvail(data.available ? { state: 'ok' } : { state: 'bad', reason: data.reason })
      } catch {
        if (!cancelled) setAvail({ state: 'idle' })
      }
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [values.subdomain])

  async function onSubmit(e) {
    e.preventDefault()
    if (!accepted) return setErrors({ terms: 'Please accept the Terms and Privacy Policy' })
    setStatus('sending')
    setErrors({})
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setCreatedSub(values.subdomain)
        setStatus('done')
      } else if (data.errors) {
        setErrors(data.errors)
        setStatus('idle')
      } else if (res.status === 429) {
        setStatus('limited')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    const loginHref = rootDomain ? `https://${createdSub}.${rootDomain}/login` : `/login?school=${createdSub}`
    return (
      <div className="nz-success" role="status">
        <div className="nz-success-mark" aria-hidden="true">✓</div>
        <h2 className="serif">Your school is ready</h2>
        <p>Sign in with the email and password you just chose.</p>
        <a className="btn btn-clay btn-lg" href={loginHref}>Go to sign in</a>
      </div>
    )
  }

  const field = (id, label, props = {}) => (
    <div className="nz-field">
      <label htmlFor={`rg-${id}`}>{label}</label>
      <input
        id={`rg-${id}`}
        name={id}
        value={values[id]}
        onChange={set(id)}
        aria-invalid={errors[id] ? 'true' : undefined}
        {...props}
      />
      {errors[id] && <p className="nz-err">{errors[id]}</p>}
    </div>
  )

  return (
    <form className="nz-form" onSubmit={onSubmit} noValidate>
      {field('schoolName', 'School name', { required: true, autoComplete: 'organization', maxLength: 120 })}

      <div className="nz-field">
        <label htmlFor="rg-subdomain">School address</label>
        <input
          id="rg-subdomain"
          name="subdomain"
          value={values.subdomain}
          onChange={set('subdomain')}
          required
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          maxLength={30}
          placeholder="yourschool"
          aria-invalid={errors.subdomain || avail.state === 'bad' ? 'true' : undefined}
          aria-describedby="rg-sub-hint"
        />
        <p className="nz-fine" id="rg-sub-hint" style={{ textAlign: 'left', marginTop: 6 }} aria-live="polite">
          {rootDomain ? `${values.subdomain || 'yourschool'}.${rootDomain}` : `Your school address: ${values.subdomain || 'yourschool'}`}
          {avail.state === 'checking' && ' · checking…'}
          {avail.state === 'ok' && ' · ✓ available'}
        </p>
        {avail.state === 'bad' && <p className="nz-err">{AVAIL_TEXT[avail.reason] || 'Not available'}</p>}
        {errors.subdomain && <p className="nz-err">{errors.subdomain}</p>}
      </div>

      {field('principalName', 'Principal’s name', { required: true, autoComplete: 'name', maxLength: 120 })}
      <div className="nz-row">
        {field('email', 'Email (your sign-in)', { required: true, type: 'email', inputMode: 'email', autoComplete: 'email', maxLength: 254 })}
        {field('phone', 'Mobile number', { required: true, type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: '0300 1234567', maxLength: 30 })}
      </div>
      {field('password', 'Password', { required: true, type: 'password', autoComplete: 'new-password', minLength: 10, maxLength: 100 })}
      <p className="nz-fine" style={{ textAlign: 'left', marginTop: -8 }}>At least 10 characters, with letters and a number.</p>

      <div className="nz-hp" aria-hidden="true">
        <label htmlFor="rg-website">Website</label>
        <input id="rg-website" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={set('website')} />
      </div>

      <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 14 }}>
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} style={{ marginTop: 4 }} />
        <span>
          I agree to the <Link href="/terms" target="_blank">Terms of Service</Link> and{' '}
          <Link href="/privacy" target="_blank">Privacy Policy</Link>.
        </span>
      </label>
      {errors.terms && <p className="nz-err">{errors.terms}</p>}

      <button type="submit" className="btn btn-clay btn-lg nz-submit" disabled={status === 'sending' || avail.state === 'bad'}>
        {status === 'sending' ? 'Creating…' : 'Create my school'}
      </button>
      {status === 'error' && <p className="nz-err" role="alert">Something went wrong. Please try again.</p>}
      {status === 'limited' && <p className="nz-err" role="alert">Too many attempts. Please try again later.</p>}
    </form>
  )
}
