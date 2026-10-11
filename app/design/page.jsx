import { notFound } from 'next/navigation'
import { urdu } from '@/lib/urdu-font'
import DesignPreview from './DesignPreview'

// Dev-only design system preview. 404 in production builds, never indexed.
export const metadata = { title: 'Design system', robots: { index: false, follow: false } }

export default function DesignPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return (
    <div className={urdu.variable}>
      <DesignPreview />
    </div>
  )
}
