'use client'

import { signOut } from 'next-auth/react'
import AppShell from './AppShell'

// Thin client wrapper: the server layout decides WHAT to show (brand, permitted menu, user);
// this only supplies the sign-out action, which cannot be passed from a server component.
export default function SchoolShell({ children, ...props }) {
  return (
    <AppShell {...props} onSignOut={() => signOut({ callbackUrl: '/login' })}>
      {children}
    </AppShell>
  )
}
