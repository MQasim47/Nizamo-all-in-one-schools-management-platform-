'use client'

import { useSession } from 'next-auth/react'
import { initials } from '@/lib/utils/format'

export default function Topbar({ title, actions }) {
  const { data: session } = useSession()
  const name = session?.user?.name || ''

  return (
    <div className="bg-warm-white border-b border-[rgba(92,61,46,0.12)] px-[26px] py-[13px] flex items-center justify-between sticky top-0 z-50">
      <div className="font-serif text-[19px] text-text-dark">{title}</div>
      <div className="flex items-center gap-2.5">
        {actions}
        <div className="w-8 h-8 bg-terracotta rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          {initials(name)}
        </div>
      </div>
    </div>
  )
}
