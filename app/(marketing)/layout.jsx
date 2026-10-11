import Link from 'next/link'
import { Noto_Naskh_Arabic } from 'next/font/google'
import MarketingEffects from '@/components/marketing/MarketingEffects'
import { CONTACT_EMAIL, PRIMARY_CTA_HREF, SIGNUP_OPEN, whatsappLink } from '@/lib/site'
import './marketing.css'

// Urdu script font: small, loaded only for the marketing site, fetched only when Urdu glyphs appear.
const urdu = Noto_Naskh_Arabic({ subsets: ['arabic'], display: 'swap', variable: '--font-urdu', preload: false })

export default function MarketingLayout({ children }) {
  const wa = whatsappLink('Assalam o Alaikum, I would like to know about Nizamo.')
  return (
    <div className={`nz-home ${urdu.variable}`}>
      <a className="skip" href="#main">Skip to content</a>

      <header data-nz-nav>
        <div className="nav-in">
          <Link href="/" className="logo" aria-label="Nizamo home">
            <span className="logo-mark" aria-hidden="true">N</span>
            <span className="logo-text">Nizamo</span>
          </Link>
          <nav className="nav-links" aria-label="Main">
            <Link href="/#modules">Modules</Link>
            <Link href="/#why">Why Nizamo</Link>
            <Link href="/#founding">Founding Schools</Link>
            <Link href="/#faq">FAQ</Link>
          </nav>
          <div className="nav-cta">
            <Link href="/login" className="btn btn-ghost nav-signin">School sign in</Link>
            <Link href={PRIMARY_CTA_HREF} className="btn btn-dark">{SIGNUP_OPEN ? 'Get started' : 'Join waitlist'}</Link>
          </div>
        </div>
      </header>

      <main id="main">{children}</main>

      <footer>
        <div className="wrap">
          <div className="foot-in">
            <div className="foot-brand">
              <Link href="/" className="logo" aria-label="Nizamo home">
                <span className="logo-mark" aria-hidden="true">N</span>
                <span className="logo-text">Nizamo</span>
              </Link>
              <p>School management built for the schools of Pakistan.</p>
            </div>
            <div className="foot-cols">
              <div className="foot-col">
                <h2>Nizamo</h2>
                <Link href="/#modules">Modules</Link>
                <Link href="/#founding">Founding Schools</Link>
                <Link href="/#faq">FAQ</Link>
                <Link href="/login">School sign in</Link>
              </div>
              <div className="foot-col">
                <h2>Contact &amp; legal</h2>
                {CONTACT_EMAIL && <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>}
                {wa && <a href={wa} rel="noopener noreferrer" target="_blank">WhatsApp us</a>}
                <Link href="/privacy">Privacy Policy</Link>
                <Link href="/terms">Terms of Service</Link>
              </div>
            </div>
          </div>
          <div className="foot-bottom">
            <span>© {new Date().getFullYear()} Nizamo. All rights reserved.</span>
            <span>Made with care in Pakistan</span>
          </div>
        </div>
      </footer>

      <MarketingEffects />
    </div>
  )
}
