'use client'

import { useState } from 'react'
import DataTable from '@/components/ui/DataTable'
import EmptyState from '@/components/ui/EmptyState'
import Badge from '@/components/ui/Pill'
import { notify } from '@/components/ui/Toast'
import { STUDENT_RANGES, WAITLIST_STATUSES } from '@/lib/waitlist-options'

const STATUS_TONE = { new: 'accent', contacted: 'neutral', demo: 'warning', converted: 'success' }
const cap = (s) => s[0].toUpperCase() + s.slice(1)

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function WaitlistTable({ rows: initial }) {
  const [rows, setRows] = useState(initial)

  async function changeStatus(row, status) {
    if (status === row.status) return
    const res = await fetch(`/api/admin/waitlist/${row.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status } : r)))
      notify.success(`${row.school_name} marked ${status}`)
    } else {
      notify.error('Could not change the status. Please try again.')
    }
  }

  return (
    <DataTable
      caption="Founding Schools waitlist"
      rows={rows}
      initialSort={{ key: 'created_at', dir: 'desc' }}
      columns={[
        { key: 'school_name', header: 'School', primary: true, sortable: true },
        { key: 'contact_name', header: 'Contact', render: (r) => (
          <>
            {r.contact_name}
            {r.email && <span className="block text-caption text-ink-3">{r.email}</span>}
          </>
        ) },
        { key: 'city', header: 'City', sortable: true },
        { key: 'student_count_range', header: 'Students', render: (r) => STUDENT_RANGES[r.student_count_range] || r.student_count_range },
        { key: 'whatsapp', header: 'WhatsApp', render: (r) => (
          <a href={`https://wa.me/${r.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-accent-text underline-offset-2 hover:underline">
            {r.whatsapp}
          </a>
        ) },
        { key: 'status', header: 'Status', sortable: true, render: (r) => <Badge tone={STATUS_TONE[r.status] || 'neutral'} dot>{cap(r.status)}</Badge> },
        { key: 'created_at', header: 'Joined', sortable: true, render: (r) => formatDate(r.created_at) },
      ]}
      rowActions={(r) => WAITLIST_STATUSES.filter((s) => s !== r.status).map((s) => ({ label: `Mark as ${s}`, onClick: () => changeStatus(r, s) }))}
      empty={<EmptyState title="No schools match" description="When schools join the waitlist from the website they appear here." />}
    />
  )
}
