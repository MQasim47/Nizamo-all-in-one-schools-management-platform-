import './globals.css'
import { Toaster } from 'react-hot-toast'
import AuthProvider from '@/components/providers/AuthProvider'

export const metadata = {
  title: 'Edu4Everyone – School Management SaaS',
  description: 'A complete cloud-based school management platform built for Pakistani schools.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
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
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '13px',
              },
              success: {
                iconTheme: { primary: '#4A8C6F', secondary: '#FBF8F3' },
              },
              error: {
                iconTheme: { primary: '#C0392B', secondary: '#FBF8F3' },
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
