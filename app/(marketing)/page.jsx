import Link from 'next/link'
import JsonLd from '@/components/marketing/JsonLd'
import WaitlistForm from '@/components/marketing/WaitlistForm'
import { FOUNDING_OFFER } from '@/lib/offer'
import { FAQ, MODULES, PAINS, WHY } from '@/lib/marketing-content'
import { PRIMARY_CTA_HREF, PRIMARY_CTA_LABEL, SITE_NAME, siteUrl } from '@/lib/site'
import { pageMetadata } from '@/lib/seo'

const TITLE = 'Nizamo — School management software for Pakistani schools'
const DESCRIPTION =
  'Pakistan ka school, Pakistan ka system. Nizamo brings the General Register, attendance, results, fees and parent updates on WhatsApp into one calm platform for Pakistani schools. Join the Founding Schools waitlist.'

export function generateMetadata() {
  return pageMetadata({ title: TITLE, description: DESCRIPTION, path: '/', absoluteTitle: true })
}

export default function HomePage() {
  const url = siteUrl()
  const { numbers } = FOUNDING_OFFER

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Organization',
              '@id': `${url}/#organization`,
              name: SITE_NAME,
              url,
              logo: `${url}/icon.png`,
              description: DESCRIPTION,
              areaServed: 'PK',
            },
            {
              '@type': 'SoftwareApplication',
              '@id': `${url}/#software`,
              name: SITE_NAME,
              url,
              applicationCategory: 'EducationalApplication',
              operatingSystem: 'Web',
              description: DESCRIPTION,
              inLanguage: ['en', 'ur'],
              publisher: { '@id': `${url}/#organization` },
            },
            {
              '@type': 'FAQPage',
              mainEntity: FAQ.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            },
          ],
        }}
      />

      {/* HERO */}
      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">Built for Pakistani schools</p>
          <h1>
            Pakistan ka school, <em>Pakistan ka system</em>
          </h1>
          <p className="sub">
            The all-in-one platform for your school: General Register, attendance, results, fees and
            parent updates, in English and Urdu, built around WhatsApp.
          </p>
          <div className="hero-actions">
            <Link href={PRIMARY_CTA_HREF} className="btn btn-clay btn-lg">{PRIMARY_CTA_LABEL}</Link>
            <Link href="#modules" className="btn btn-ghost btn-lg">See what is inside</Link>
          </div>
          <p className="hero-note">We are onboarding Founding Schools now. Free data setup from your registers.</p>

          <div
            className="preview"
            role="img"
            aria-label="Illustration of the General Register screen: a table of students with GR number, class, and a masked CNIC"
          >
            <div className="preview-bar">
              <span>Nizamo — General Register</span>
              <span>Illustration</span>
            </div>
            <div className="preview-body" aria-hidden="true">
              <div className="pv-title">Class 9-A · 38 students</div>
              <div className="pv-scroll">
                <table className="pv-table">
                  <thead>
                    <tr><th>GR</th><th>Name</th><th>Father</th><th>Father CNIC</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>1001</td><td>Ali Hassan</td><td>Muhammad Hassan</td><td>42101-*****-3</td><td><span className="pv-chip">Active</span></td></tr>
                    <tr><td>1002</td><td>Sara Ahmed</td><td>Ahmed Raza</td><td>35202-*****-7</td><td><span className="pv-chip">Active</span></td></tr>
                    <tr><td>1003</td><td>Bilal Khan</td><td>Imran Khan</td><td>37405-*****-1</td><td><span className="pv-chip">Active</span></td></tr>
                  </tbody>
                </table>
              </div>
              <p className="pv-note">Sensitive numbers are masked in lists and shown in full only to people allowed to see them.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PAIN -> SOLUTION */}
      <section className="section" id="problem" aria-labelledby="problem-title">
        <div className="wrap">
          <div className="sec-head reveal">
            <p className="sec-tag">Sound familiar?</p>
            <h2 className="sec-title" id="problem-title">Running a school should not mean running after paperwork.</h2>
            <p className="sec-desc">Registers, Excel sheets and WhatsApp groups each hold a piece. Nizamo connects them.</p>
          </div>
          <div className="pairs">
            {PAINS.map((p) => (
              <div className="pair reveal" key={p.pain}>
                <div>
                  <p className="label is-pain">Today</p>
                  <p>{p.pain}</p>
                </div>
                <div className="fix">
                  <p className="label is-fix">With Nizamo</p>
                  <p>{p.solution}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section className="section" id="modules" aria-labelledby="modules-title">
        <div className="wrap">
          <div className="sec-head reveal">
            <p className="sec-tag">One connected platform</p>
            <h2 className="sec-title" id="modules-title">Everything a school does, in one place.</h2>
            <p className="sec-desc">Enter it once and it is everywhere it needs to be. These modules are being built together with our Founding Schools.</p>
          </div>
          <div className="cards">
            {MODULES.map((m) => (
              <article className="card reveal" key={m.id}>
                <h3>{m.title}</h3>
                <p>{m.text}</p>
                <span className="tag">In development</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* WHY */}
      <section className="section" id="why" aria-labelledby="why-title">
        <div className="wrap">
          <div className="sec-head reveal">
            <p className="sec-tag">Why Nizamo</p>
            <h2 className="sec-title" id="why-title">Designed around how Pakistani schools really work.</h2>
          </div>
          <div className="why-grid">
            {WHY.map((w) => (
              <div className="why-item reveal" key={w.title}>
                <h3>{w.title}</h3>
                <p>{w.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOUNDING SCHOOLS */}
      <section className="section" id="founding" aria-labelledby="founding-title">
        <div className="wrap">
          <div className="offer reveal">
            <div className="sec-head">
              <p className="sec-tag">{FOUNDING_OFFER.eyebrow}</p>
              <h2 className="sec-title" id="founding-title">{FOUNDING_OFFER.heading}</h2>
              <p className="sec-desc">{FOUNDING_OFFER.intro}</p>
            </div>
            <ul className="perks">
              {FOUNDING_OFFER.perks.map((perk) => (
                <li className="perk" key={perk.title}>
                  <h3>{perk.title}</h3>
                  <p>{perk.text}</p>
                </li>
              ))}
            </ul>
            {(numbers.seats || numbers.priceNote || numbers.lockInNote) && (
              <p className="offer-nums">
                {[numbers.seats && `${numbers.seats} seats`, numbers.priceNote, numbers.lockInNote].filter(Boolean).join(' · ')}
              </p>
            )}
            <div className="offer-cta">
              <Link href={PRIMARY_CTA_HREF} className="btn btn-clay btn-lg">{PRIMARY_CTA_LABEL}</Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" id="faq" aria-labelledby="faq-title">
        <div className="wrap">
          <div className="sec-head reveal">
            <p className="sec-tag">Questions</p>
            <h2 className="sec-title" id="faq-title">Frequently asked questions</h2>
          </div>
          <div className="faq reveal">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* WAITLIST */}
      <section className="section" id="waitlist" aria-labelledby="waitlist-title">
        <div className="wrap">
          <div className="sec-head reveal">
            <p className="sec-tag">Founding Schools waitlist</p>
            <h2 className="sec-title" id="waitlist-title">Tell us about your school.</h2>
            <p className="sec-desc">It takes a minute. We will contact you on WhatsApp.</p>
          </div>
          <div className="wl-card reveal">
            <WaitlistForm />
          </div>
        </div>
      </section>
    </>
  )
}
