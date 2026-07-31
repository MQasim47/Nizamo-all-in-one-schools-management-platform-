'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import './home.css'

export default function Home() {
  useEffect(() => {
    const nav = document.getElementById('nav')
    const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 30)
    window.addEventListener('scroll', onScroll)

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.14 }
    )
    document.querySelectorAll('.reveal').forEach((el) => io.observe(el))

    const frame = document.getElementById('frame')
    const fio = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            document.querySelectorAll('.fill').forEach((f) => {
              f.style.width = f.dataset.w + '%'
            })
            document.querySelectorAll('[data-count]').forEach((c) => {
              const t = +c.dataset.count
              let n = 0
              const step = Math.max(1, Math.round(t / 40))
              const iv = setInterval(() => {
                n += step
                if (n >= t) {
                  c.textContent = t
                  clearInterval(iv)
                } else {
                  c.textContent = n
                }
              }, 22)
            })
            fio.unobserve(e.target)
          }
        })
      },
      { threshold: 0.3 }
    )
    if (frame) fio.observe(frame)

    return () => {
      window.removeEventListener('scroll', onScroll)
      io.disconnect()
      fio.disconnect()
    }
  }, [])

  return (
    <div className="nz-home">
      <nav id="nav">
        <Link href="/" className="logo">
          <div className="logo-mark">N</div>
          <div className="logo-text">Nizamo</div>
        </Link>
        <div className="nav-links">
          <a href="#features">Platform</a>
          <a href="#how">How it works</a>
          <a href="#roles">For everyone</a>
          <a href="#pricing">Pricing</a>
        </div>
        <div className="nav-cta">
          <Link href="/login" className="btn btn-ghost">Sign in</Link>
          <Link href="/register" className="btn btn-dark">Get started</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="eyebrow reveal"><span className="dot"></span> Built for Pakistani schools</div>
        <h1 className="serif reveal d1">The operating system<br />for <em>every</em> school.</h1>
        <p className="sub reveal d2">Admissions, attendance, exams, marksheets, the General Register, and fees — the entire school, running in one calm, connected place.</p>
        <div className="hero-actions reveal d3">
          <Link href="/register" className="btn btn-clay btn-lg">Start free for 30 days →</Link>
          <a href="#features" className="btn btn-ghost btn-lg">See the platform</a>
        </div>
        <div className="hero-note reveal d4">
          <span><b>✓</b> No credit card</span>
          <span><b>✓</b> Setup in minutes</span>
          <span><b>✓</b> Your data, always yours</span>
        </div>
      </section>

      <div className="showcase">
        <div className="frame" id="frame">
          <div className="frame-bar">
            <div className="dot-r dr1"></div><div className="dot-r dr2"></div><div className="dot-r dr3"></div>
            <div className="frame-title">Nizamo — School dashboard</div>
          </div>
          <div className="frame-body">
            <div className="mock-side">
              <div className="mock-brand"><div className="m">N</div><span>Nizamo</span></div>
              <div className="mnav on"><i>▦</i> Dashboard</div>
              <div className="mnav"><i>◉</i> Students</div>
              <div className="mnav"><i>✎</i> Attendance</div>
              <div className="mnav"><i>▤</i> Results</div>
              <div className="mnav"><i>◈</i> Marksheets</div>
              <div className="mnav"><i>▣</i> General Register</div>
              <div className="mnav"><i>₨</i> Fees</div>
            </div>
            <div className="mock-main">
              <div className="mock-h serif">Good morning, Principal</div>
              <div className="mock-sub">Thursday — here's your school today</div>
              <div className="mock-stats">
                <div className="mstat"><div className="l">Students</div><div className="v" data-count="450">0</div></div>
                <div className="mstat"><div className="l">Teachers</div><div className="v" data-count="25">0</div></div>
                <div className="mstat"><div className="l">Fees due</div><div className="v clay" data-count="8">0</div></div>
              </div>
              <div className="mbars">
                <div className="mbars-h">Today's attendance</div>
                <div className="mbar"><span className="n">10-A</span><div className="track"><div className="fill" data-w="92" style={{ background: 'var(--clay)' }}></div></div><span className="p">92%</span></div>
                <div className="mbar"><span className="n">9-A</span><div className="track"><div className="fill" data-w="97" style={{ background: 'var(--clay)' }}></div></div><span className="p">97%</span></div>
                <div className="mbar"><span className="n">9-B</span><div className="track"><div className="fill" data-w="74" style={{ background: '#d4a853' }}></div></div><span className="p">74%</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="section" id="features">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="sec-tag">One connected platform</div>
            <h2 className="sec-title serif">Everything a school does,<br />finally in one place.</h2>
            <p className="sec-desc">Not a bundle of separate tools — one connected system. Attendance flows into marksheets, results into the General Register, students into fees. Enter it once, and it's everywhere it needs to be.</p>
          </div>

          <div className="bento">
            <div className="tile big reveal">
              <div className="t-icon">◈</div>
              <div className="t-title">Marksheets in one click</div>
              <div className="t-desc">Once results are approved, generate a professional marksheet for a single student — or an entire class — instantly. Logo, grades, attendance and rank, all filled in automatically.</div>
              <div className="mini-ms">
                <div className="mini-ms-h">🏫 Final Examination — Class 10</div>
                <table>
                  <tbody>
                    <tr><th>Subject</th><th style={{ textAlign: 'right' }}>Marks</th><th style={{ textAlign: 'right' }}>Grade</th></tr>
                    <tr><td>Mathematics</td><td style={{ textAlign: 'right' }}>87</td><td className="g">A</td></tr>
                    <tr><td>Science</td><td style={{ textAlign: 'right' }}>92</td><td className="g">A+</td></tr>
                    <tr><td>English</td><td style={{ textAlign: 'right' }}>78</td><td className="g">B+</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="tile small reveal d1">
              <div className="t-icon">▣</div>
              <div className="t-title">General Register</div>
              <div className="t-desc">The complete legal record — caste, B-Form, date of birth, previous school — kept digitally. Generate a School Leaving Certificate the moment you need one.</div>
              <span className="t-tag">One-click SLC</span>
            </div>

            <div className="tile small reveal">
              <div className="t-icon">₨</div>
              <div className="t-title">Fee management</div>
              <div className="t-desc">Monthly challans, admission fees, and instant defaulter reports. Know exactly who has paid — and who hasn't — at a glance.</div>
              <span className="t-tag">Live dues</span>
            </div>

            <div className="tile small reveal d1">
              <div className="t-icon">✎</div>
              <div className="t-title">Daily attendance</div>
              <div className="t-desc">Teachers mark present, absent, or late in seconds. Monthly reports build themselves.</div>
            </div>

            <div className="tile small reveal d2">
              <div className="t-icon">▤</div>
              <div className="t-title">Results & approvals</div>
              <div className="t-desc">Teachers enter marks, the principal approves. A clean workflow with a full audit trail.</div>
            </div>

            <div className="tile half reveal">
              <div className="t-icon">🗂️</div>
              <div className="t-title">Consolidated result sheet</div>
              <div className="t-desc">The whole class on one gazette — every subject across the top, every student down the side. The traditional format, generated automatically.</div>
              <span className="t-tag">Class gazette</span>
            </div>

            <div className="tile half reveal d1">
              <div className="t-icon">🔒</div>
              <div className="t-title">Private & secure by design</div>
              <div className="t-desc">Every school gets its own isolated portal. Principals, teachers, and admins each see exactly what they should — nothing more.</div>
              <span className="t-tag">Role-based access</span>
            </div>
          </div>
        </div>
      </section>

      <div className="metrics reveal">
        <div className="metrics-in">
          <div className="metric"><div className="num serif">100<em>%</em></div><div className="lbl">Your data ownership</div></div>
          <div className="metric"><div className="num serif">9<em>+</em></div><div className="lbl">Connected modules</div></div>
          <div className="metric"><div className="num serif">3</div><div className="lbl">Dedicated portals</div></div>
          <div className="metric"><div className="num serif">30</div><div className="lbl">Day free trial</div></div>
        </div>
      </div>

      <section className="section" id="how">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="sec-tag">Simple onboarding</div>
            <h2 className="sec-title serif">Live in an afternoon.</h2>
            <p className="sec-desc">No installation, no IT team, no training week. If you can use WhatsApp, you can run your school on Nizamo.</p>
          </div>
          <div className="steps">
            <div className="step reveal"><div className="n serif">01</div><h4>Register your school</h4><p>Enter your school name and pick a portal address. Your private space is created instantly.</p></div>
            <div className="step reveal d1"><div className="n serif">02</div><h4>Add your classes</h4><p>Set up grades, sections and subjects. Import your student list from Excel in one upload.</p></div>
            <div className="step reveal d2"><div className="n serif">03</div><h4>Invite your teachers</h4><p>Create teacher accounts and assign them to classes. They only ever see what's theirs.</p></div>
            <div className="step reveal d3"><div className="n serif">04</div><h4>Run your school</h4><p>Attendance, results, marksheets and fees — all live from day one. Nothing to install.</p></div>
          </div>
        </div>
      </section>

      <section className="section" id="roles">
        <div className="wrap">
          <div className="sec-head reveal">
            <div className="sec-tag">For everyone</div>
            <h2 className="sec-title serif">One platform.<br />Three points of view.</h2>
            <p className="sec-desc">Everyone in your school gets a portal built around their role — focused, clean, and free of clutter they don't need.</p>
          </div>
          <div className="roles">
            <div className="role reveal">
              <div className="role-left">
                <div className="role-idx">For leadership</div>
                <h4 className="serif">The Principal</h4>
                <div className="rd">Complete oversight of the school in a single, calm view — every approval, marksheet and rupee accounted for.</div>
              </div>
              <div className="role-caps">
                <div className="cap"><span className="ct">Approve results</span><span className="cs">Review and sign off every teacher's marks</span></div>
                <div className="cap"><span className="ct">Generate marksheets</span><span className="cs">A whole class, printed in one click</span></div>
                <div className="cap"><span className="ct">Track fee defaulters</span><span className="cs">See exactly who owes, and how much</span></div>
                <div className="cap"><span className="ct">Manage staff & students</span><span className="cs">The full roster, always up to date</span></div>
              </div>
            </div>

            <div className="role reveal">
              <div className="role-left">
                <div className="role-idx">For the classroom</div>
                <h4 className="serif">The Teacher</h4>
                <div className="rd">A focused workspace that shows only their own classes — no clutter, no distraction, nothing that isn't theirs.</div>
              </div>
              <div className="role-caps">
                <div className="cap"><span className="ct">Mark attendance</span><span className="cs">The whole class in a few taps</span></div>
                <div className="cap"><span className="ct">Enter exam marks</span><span className="cs">Grades calculated automatically</span></div>
                <div className="cap"><span className="ct">Post homework</span><span className="cs">With due dates and attachments</span></div>
                <div className="cap"><span className="ct">Only their students</span><span className="cs">Assigned classes, and nothing more</span></div>
              </div>
            </div>

            <div className="role reveal">
              <div className="role-left">
                <div className="role-idx">For groups & chains</div>
                <h4 className="serif">The Owner</h4>
                <div className="rd">Running more than one campus? Oversee every school in the group from a single command centre.</div>
              </div>
              <div className="role-caps">
                <div className="cap"><span className="ct">Add new campuses</span><span className="cs">Spin up a school in minutes</span></div>
                <div className="cap"><span className="ct">Oversee every school</span><span className="cs">All campuses, one dashboard</span></div>
                <div className="cap"><span className="ct">Manage subscriptions</span><span className="cs">Billing and plans in one place</span></div>
                <div className="cap"><span className="ct">Open any portal</span><span className="cs">Jump into any campus instantly</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta" id="pricing">
        <div className="wrap reveal">
          <h2 className="serif">Ready to run your<br />school the <em>modern</em> way?</h2>
          <p>Start free for 30 days. No credit card, no setup fees, no commitment.</p>
          <div className="cta-actions">
            <Link href="/register" className="btn btn-clay btn-lg">Register your school free →</Link>
            <Link href="/login?school=ghs" className="btn btn-ghost btn-lg">View live demo</Link>
          </div>
          <div className="cta-fine">✓ Your data is always yours &nbsp;·&nbsp; ✓ Export anytime &nbsp;·&nbsp; ✓ Cancel anytime</div>
        </div>
      </section>

      <footer>
        <div className="foot-in">
          <div className="foot-brand">
            <Link href="/" className="logo"><div className="logo-mark">N</div><div className="logo-text">Nizamo</div></Link>
            <p>The operating system for schools. Built with care for the schools of Pakistan and beyond.</p>
          </div>
          <div className="foot-cols">
            <div className="foot-col"><h5>Platform</h5><a href="#features">Features</a><a href="#how">How it works</a><a href="#pricing">Pricing</a></div>
            <div className="foot-col"><h5>Company</h5><a href="#">About</a><a href="#">Contact</a><a href="#">Careers</a></div>
            <div className="foot-col"><h5>Account</h5><Link href="/login">Sign in</Link><Link href="/register">Register school</Link><Link href="/login?school=ghs">Demo</Link></div>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 Nizamo. All rights reserved.</span>
          <span>Made with care in Pakistan 🇵🇰</span>
        </div>
      </footer>
    </div>
  )
}
