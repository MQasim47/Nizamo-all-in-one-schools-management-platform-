import { urdu } from '@/lib/urdu-font'

// Sign-in pages carry a short Urdu line; the font loads only when Urdu glyphs are actually shown.
export default function AuthLayout({ children }) {
  return <div className={urdu.variable}>{children}</div>
}
