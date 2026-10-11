import Link from 'next/link'
import RegisterForm from '@/components/marketing/RegisterForm'
import { PRIMARY_CTA_HREF, ROOT_DOMAIN, SIGNUP_OPEN } from '@/lib/site'
import { pageMetadata } from '@/lib/seo'

const TITLE = 'Register your school'
const DESCRIPTION = SIGNUP_OPEN
  ? 'Create your school’s Nizamo account: choose your school address, add the principal, and start setting up.'
  : 'Nizamo is onboarding Founding Schools first. Join the waitlist and we will contact you on WhatsApp.'

export function generateMetadata() {
  return pageMetadata({
    title: SIGNUP_OPEN ? TITLE : 'Founding Schools',
    description: DESCRIPTION,
    path: '/register',
    // While signup is closed this page is a pointer to the waitlist, not something to index.
    robots: SIGNUP_OPEN ? { index: true, follow: true } : { index: false, follow: true },
  })
}

export default function RegisterPage() {
  if (!SIGNUP_OPEN) {
    return (
      <section className="center-page">
        <div className="wrap">
          <div className="card">
            <p className="sec-tag">Founding Schools</p>
            <h1 className="sec-title">We are onboarding Founding Schools</h1>
            <p className="sec-desc" style={{ marginBottom: 24 }}>
              Nizamo is opening to a small group of schools first. Join the waitlist and we will contact you on
              WhatsApp to set up your school together.
            </p>
            <Link href={PRIMARY_CTA_HREF} className="btn btn-clay btn-lg">Join the waitlist</Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="center-page">
      <div className="wrap">
        <h1 className="sec-title">Register your school</h1>
        <p className="sec-desc" style={{ marginBottom: 28 }}>Create your school’s account in a minute.</p>
        <div className="wl-card" style={{ textAlign: 'left' }}>
          <RegisterForm rootDomain={ROOT_DOMAIN} />
        </div>
      </div>
    </section>
  )
}
