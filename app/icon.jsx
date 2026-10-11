import { markIcon } from '@/lib/brand-image'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return markIcon(512)
}
