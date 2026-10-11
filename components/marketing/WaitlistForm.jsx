'use client'

import { useEffect, useState } from 'react'
import { STUDENT_RANGES } from '@/lib/waitlist-options'

const EMPTY = { school_name: '', contact_name: '', city: '', student_count_range: '', whatsapp: '', email: '', website: '' }

// Collect utm_* parameters once so we know which campaign brought the school in.
function readSource() {
  try {
    const p = new URLSearchParams(window.location.search)
    const parts = ['utm_source', 'utm_medium', 'utm_campaign'].filter((k) => p.get(k)).map((k) => `${k}=${p.get(k)}`)
    return parts.join('&').slice(0, 200)
  } catch {
    return ''
  }
}

export default function WaitlistForm() {
  const [values, setValues] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('idle') // idle | sending | done | duplicate | error | limited
  const [source, setSource] = useState('')

  useEffect(() => setSource(readSource()), [])

  const set = (k) => (e) => setValues((v) => ({ ...v, [k]: e.target.value }))

  async function onSubmit(e) {
    e.preventDefault()
    setStatus('sending')
    setErrors({})
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...values, source }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setStatus(data.duplicate ? 'duplicate' : 'done')
      } else if (res.status === 400 && data.errors) {
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

  if (status === 'done' || status === 'duplicate') {
    const dup = status === 'duplicate'
    return (
      <div className="nz-success" role="status">
        <div className="nz-success-mark" aria-hidden="true">✓</div>
        <h3 className="serif">{dup ? 'You are already on the list' : 'Thank you — you are on the list'}</h3>
        <p>
          {dup
            ? 'We already have this WhatsApp number. We will be in touch soon.'
            : 'We will contact you on WhatsApp soon to talk about Founding Schools.'}
        </p>
        <p className="ur" lang="ur" dir="rtl">
          {dup
            ? 'یہ واٹس ایپ نمبر پہلے سے فہرست میں موجود ہے۔ ہم جلد آپ سے رابطہ کریں گے۔'
            : 'شکریہ! آپ نظامو کی ویٹ لسٹ میں شامل ہو گئے ہیں۔ ہم جلد آپ سے واٹس ایپ پر رابطہ کریں گے۔'}
        </p>
      </div>
    )
  }

  const field = (id, label, props = {}) => (
    <div className="nz-field">
      <label htmlFor={`wl-${id}`}>{label}</label>
      <input
        id={`wl-${id}`}
        name={id}
        value={values[id]}
        onChange={set(id)}
        aria-invalid={errors[id] ? 'true' : undefined}
        aria-describedby={errors[id] ? `wl-${id}-err` : undefined}
        {...props}
      />
      {errors[id] && <p className="nz-err" id={`wl-${id}-err`}>{errors[id]}</p>}
    </div>
  )

  return (
    <form className="nz-form" onSubmit={onSubmit} noValidate>
      {field('school_name', 'School name', { required: true, autoComplete: 'organization', maxLength: 120 })}
      {field('contact_name', 'Your name', { required: true, autoComplete: 'name', maxLength: 80 })}
      <div className="nz-row">
        {field('city', 'City', { required: true, autoComplete: 'address-level2', maxLength: 60 })}
        <div className="nz-field">
          <label htmlFor="wl-range">Number of students</label>
          <select
            id="wl-range"
            name="student_count_range"
            value={values.student_count_range}
            onChange={set('student_count_range')}
            required
            aria-invalid={errors.student_count_range ? 'true' : undefined}
          >
            <option value="" disabled>Select…</option>
            {Object.entries(STUDENT_RANGES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          {errors.student_count_range && <p className="nz-err">Please choose a range</p>}
        </div>
      </div>
      {field('whatsapp', 'WhatsApp number', {
        required: true, type: 'tel', inputMode: 'tel', autoComplete: 'tel', placeholder: '0300 1234567', maxLength: 30,
      })}
      {field('email', 'Email (optional)', { type: 'email', inputMode: 'email', autoComplete: 'email', maxLength: 254 })}

      {/* Honeypot: invisible to people, tempting to bots */}
      <div className="nz-hp" aria-hidden="true">
        <label htmlFor="wl-website">Website</label>
        <input id="wl-website" name="website" tabIndex={-1} autoComplete="off" value={values.website} onChange={set('website')} />
      </div>

      <button type="submit" className="btn btn-clay btn-lg nz-submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Join the waitlist'}
      </button>

      {status === 'error' && <p className="nz-err" role="alert">Something went wrong. Please try again in a moment.</p>}
      {status === 'limited' && <p className="nz-err" role="alert">Too many attempts. Please try again later.</p>}
      <p className="nz-fine">
        We use your details only to contact you about Nizamo. See our <a href="/privacy">Privacy Policy</a>.
      </p>
    </form>
  )
}
