import { readFileSync } from 'node:fs'
import path from 'node:path'
import { notFound } from 'next/navigation'
import { urdu } from '@/lib/urdu-font'
import DesignPreview from './DesignPreview'

// Dev-only design system preview. 404 in production builds, never indexed.
export const metadata = { title: 'Design system', robots: { index: false, follow: false } }

export default function DesignPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  // Dev only: show the founder's logo reference next to the rebuilt mark.
  let refImage = null
  try {
    const buf = readFileSync(path.join(process.cwd(), 'docs/brand/logo-reference.jpg'))
    refImage = `data:image/jpeg;base64,${buf.toString('base64')}`
  } catch {}
  return (
    <div className={urdu.variable}>
      <DesignPreview refImage={refImage} />
    </div>
  )
}
