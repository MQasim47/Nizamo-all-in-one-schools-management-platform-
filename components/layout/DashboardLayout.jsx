'use client'

import Sidebar from './Sidebar'

export default function DashboardLayout({ children, pendingApprovalsCount = 0 }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar pendingApprovalsCount={pendingApprovalsCount} />
      <div className="ml-sidebar flex-1 flex flex-col min-h-screen">
        {children}
      </div>
    </div>
  )
}
