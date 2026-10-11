'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'
import { STUDENT_RANGES, WAITLIST_STATUSES } from '@/lib/waitlist-options'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function WaitlistTable({ rows: initial }) {
  const [rows, setRows] = useState(initial)
  const [busy, setBusy] = useState(null)

  async function changeStatus(row, status) {
    if (status === row.status) return
    setBusy(row.id)
    const res = await fetch(`/api/admin/waitlist/${row.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setBusy(null)
    if (res.ok) {
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status } : r)))
      toast.success(`Marked ${status}`)
    } else {
      toast.error('Could not change the status')
    }
  }

  if (rows.length === 0) {
    return (
      <div className="bg-warm-white border-[1.5px] border-[rgba(92,61,46,0.12)] rounded-lg p-8 text-center text-[13px] text-text-light">
        No schools match. When schools join the waitlist from the website they appear here.
      </div>
    )
  }

  return (
    <div className="bg-warm-white border-[1.5px] border-[rgba(92,61,46,0.12)] rounded-lg overflow-x-auto">
      <table className="w-full text-[13px] text-left">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-text-light border-b border-[rgba(92,61,46,0.12)]">
            {['Joined', 'School', 'Contact', 'City', 'Students', 'WhatsApp', 'Source', 'Status'].map((h) => (
              <th key={h} className="px-3 py-2.5 font-semibold whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-[rgba(92,61,46,0.08)]">
              <td className="px-3 py-2.5 whitespace-nowrap text-text-light">{formatDate(r.created_at)}</td>
              <td className="px-3 py-2.5 font-medium text-text-dark">{r.school_name}</td>
              <td className="px-3 py-2.5">
                {r.contact_name}
                {r.email && <div className="text-[11px] text-text-light">{r.email}</div>}
              </td>
              <td className="px-3 py-2.5">{r.city}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">{STUDENT_RANGES[r.student_count_range] || r.student_count_range}</td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                <a href={`https://wa.me/${r.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-terracotta no-underline">
                  {r.whatsapp}
                </a>
              </td>
              <td className="px-3 py-2.5 text-[11px] text-text-light max-w-[160px] truncate" title={r.source || ''}>{r.source || '—'}</td>
              <td className="px-3 py-2.5">
                <select
                  value={r.status}
                  disabled={busy === r.id}
                  onChange={(e) => changeStatus(r, e.target.value)}
                  aria-label={`Status for ${r.school_name}`}
                  className="px-2 py-1 border border-[rgba(92,61,46,0.2)] rounded-md bg-white text-[12px]"
                >
                  {WAITLIST_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
