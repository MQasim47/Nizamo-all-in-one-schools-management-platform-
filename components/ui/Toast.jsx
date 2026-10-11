'use client'

import toast, { Toaster } from 'react-hot-toast'
import { CircleCheck, CircleAlert, Info } from 'lucide-react'

// Mount <AppToaster/> once (root layout). Call notify.success('Saved') from anywhere on the client.
const base = {
  style: {
    background: 'var(--surface)',
    color: 'var(--text)',
    border: '1px solid var(--line-strong)',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-pop)',
    fontSize: '14px',
    padding: '10px 14px',
    maxWidth: '380px',
  },
}

export const notify = {
  success: (msg) => toast(msg, { ...base, icon: <CircleCheck size={18} strokeWidth={1.75} color="var(--ok)" aria-hidden="true" />, ariaProps: { role: 'status', 'aria-live': 'polite' } }),
  error: (msg) => toast(msg, { ...base, duration: 6000, icon: <CircleAlert size={18} strokeWidth={1.75} color="var(--bad)" aria-hidden="true" />, ariaProps: { role: 'alert', 'aria-live': 'assertive' } }),
  info: (msg) => toast(msg, { ...base, icon: <Info size={18} strokeWidth={1.75} color="var(--text-2)" aria-hidden="true" />, ariaProps: { role: 'status', 'aria-live': 'polite' } }),
}

export function AppToaster() {
  return <Toaster position="top-right" toastOptions={base} containerStyle={{ top: 16, right: 16 }} />
}
