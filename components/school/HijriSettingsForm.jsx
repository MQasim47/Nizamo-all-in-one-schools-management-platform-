'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Select } from '@/components/ui/FormControl'
import Button from '@/components/ui/Button'
import { notify } from '@/components/ui/Toast'
import { formatHijri } from '@/lib/utils/dates.mjs'

const OPTIONS = [-2, -1, 0, 1, 2]
const label = (n) => (n === 0 ? 'No adjustment' : n > 0 ? `+${n} day${n === 1 ? '' : 's'}` : `${n} day${n === -1 ? '' : 's'}`)

export default function HijriSettingsForm({ initial, canEdit }) {
  const router = useRouter()
  const [value, setValue] = useState(initial)
  const [saving, setSaving] = useState(false)

  async function save(e) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/school/settings', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hijri_offset: value }),
    })
    setSaving(false)
    if (res.ok) {
      notify.success('Hijri date adjustment saved')
      router.refresh()
    } else {
      const j = await res.json().catch(() => ({}))
      notify.error(j.error || 'Could not save. Please try again.')
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <Select
        label="Hijri date adjustment"
        value={value}
        disabled={!canEdit}
        onChange={(e) => setValue(Number(e.target.value))}
        hint="Pakistan follows moon sighting, so the Hijri date can differ by a day from printed calendars. -1 suits most years."
        className="max-w-xs"
      >
        {OPTIONS.map((n) => (
          <option key={n} value={n}>{label(n)}</option>
        ))}
      </Select>
      <p className="text-body text-ink-2">
        Today would show as <span className="font-medium text-ink" suppressHydrationWarning>{formatHijri(new Date(), value)} AH</span>
      </p>
      {canEdit ? (
        <Button type="submit" loading={saving} disabled={value === initial}>Save</Button>
      ) : (
        <p className="text-label text-ink-3">Only the principal can change this.</p>
      )}
    </form>
  )
}
