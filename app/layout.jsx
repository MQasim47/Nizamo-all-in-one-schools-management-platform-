import './globals.css'
import { Inter, Playfair_Display } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import AuthProvider from '@/components/providers/AuthProvider'
import { SITE_NAME, siteUrl } from '@/lib/site'

// Fonts are self-hosted by next/font at build time (no render-blocking Google CSS request).
const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })
const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  style: ['normal', 'italic'],
  variable: '--font-playfair',
})

const DESCRIPTION =
  'Nizamo is the school management platform built for Pakistani schools: General Register, attendance, results, fees and parent communication in one place.'

export const metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: `${SITE_NAME} — School management software for Pakistani schools`,
    template: `%s — ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    siteName: SITE_NAME,
    locale: 'en_PK',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
}

export const viewport = {
  themeColor: '#2C1810',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#FBF8F3',
                color: '#1E1208',
                border: '1.5px solid rgba(92,61,46,0.15)',
                borderRadius: '10px',
                fontFamily: 'inherit',
                fontSize: '13px',
              },
              success: { iconTheme: { primary: '#4A8C6F', secondary: '#FBF8F3' } },
              error: { iconTheme: { primary: '#C0392B', secondary: '#FBF8F3' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
