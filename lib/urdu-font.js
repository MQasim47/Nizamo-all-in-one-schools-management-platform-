import { Noto_Naskh_Arabic } from 'next/font/google'

// Urdu text for the app (login line, printouts later). Only downloaded on pages that use it.
export const urdu = Noto_Naskh_Arabic({ subsets: ['arabic'], display: 'swap', variable: '--font-urdu', preload: false })
