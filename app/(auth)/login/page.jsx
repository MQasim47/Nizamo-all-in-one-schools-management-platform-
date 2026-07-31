'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import toast from 'react-hot-toast'

function LoginForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const subdomain = searchParams.get('school') || ''

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [schoolName, setSchoolName] = useState('Edu4Everyone')
  const [schoolFound, setSchoolFound] = useState(true)
  const [checkingSchool, setCheckingSchool] = useState(true)

  useEffect(() => {
    async function checkSchool() {
      if (!subdomain) {
        setCheckingSchool(false)
        setSchoolFound(false)
        return
      }
      try {
        const res = await fetch(`/api/schools/check?subdomain=${subdomain}`)
        const data = await res.json()
        if (data.found) {
          setSchoolName(data.school.school_name)
          setSchoolFound(true)
        } else {
          setSchoolFound(false)
        }
      } catch {
        setSchoolFound(false)
      } finally {
        setCheckingSchool(false)
      }
    }
    checkSchool()
  }, [subdomain])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)

    const result = await signIn('credentials', {
      email,
      password,
      subdomain,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      toast.error('Incorrect email or password.')
    } else {
      toast.success('Welcome back!')
      router.push('/school/dashboard')
      router.refresh()
    }
  }

  function fillDemo(demoEmail) {
    setEmail(demoEmail)
    setPassword('password')
  }

  return (
    <div className="min-h-screen flex bg-cream overflow-hidden">
      {/* LEFT PANEL */}
      <div className="w-[45%] bg-espresso relative flex-col justify-between p-12 overflow-hidden hidden lg:flex">
        <div
          className="absolute -top-[100px] -right-[100px] w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(196,98,45,0.3) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-[320px] h-[320px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(212,168,83,0.2) 0%, transparent 70%)' }}
        />

        <div className="relative z-10">
          <div className="w-[50px] h-[50px] bg-terracotta rounded-2xl flex items-center justify-center text-2xl mb-3.5">
            🎓
          </div>
          <div className="font-serif text-xl text-warm-white">Edu4Everyone</div>
          <div className="text-[11px] text-brown-light tracking-[2px] uppercase mt-1">
            School Management SaaS
          </div>
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-[rgba(196,98,45,0.2)] border border-[rgba(196,98,45,0.3)] rounded-[20px] px-3.5 py-1.5 text-[11px] text-terra-light tracking-wide uppercase mb-5">
            <span className="w-1.5 h-1.5 bg-terra-light rounded-full animate-pulse-dot" />
            Secure Portal
          </div>
          <h1 className="font-serif text-[38px] leading-tight text-warm-white mb-4">
            Welcome to
            <br />
            <span className="text-gold">{schoolName}</span>
          </h1>
          <p className="text-[13px] leading-relaxed text-[rgba(251,248,243,0.5)] max-w-[300px]">
            Your school's private management portal. Track attendance, results,
            homework — all in one place.
          </p>
        </div>

        <div className="relative z-10 flex gap-8">
          <div>
            <div className="font-serif text-2xl text-warm-white">100%</div>
            <div className="text-[10px] text-[rgba(251,248,243,0.4)] uppercase tracking-wide mt-0.5">Secure</div>
          </div>
          <div>
            <div className="font-serif text-2xl text-warm-white">24/7</div>
            <div className="text-[10px] text-[rgba(251,248,243,0.4)] uppercase tracking-wide mt-0.5">Available</div>
          </div>
          <div>
            <div className="font-serif text-2xl text-warm-white">Free</div>
            <div className="text-[10px] text-[rgba(251,248,243,0.4)] uppercase tracking-wide mt-0.5">Trial</div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex-1 flex items-center justify-center p-12 bg-warm-white relative">
        {subdomain && (
          <div className="absolute top-6 right-6 bg-sand border border-[rgba(92,61,46,0.15)] rounded-lg px-3 py-1.5 text-xs text-text-mid font-medium">
            🏫 {subdomain}.edu4everyone.com
          </div>
        )}

        <div className="w-full max-w-[400px]">
          <div className="mb-6">
            <h2 className="font-serif text-[28px] text-text-dark mb-1.5">Sign In</h2>
            <p className="text-[13px] text-text-light">
              Enter your credentials to access your portal
            </p>
          </div>

          {checkingSchool ? (
            <div className="text-center py-8 text-text-light text-sm">Loading...</div>
          ) : !schoolFound ? (
            <div className="bg-[rgba(192,57,43,0.1)] border border-[rgba(192,57,43,0.25)] rounded-[10px] p-3 text-[13px] text-school-red">
              ⚠ School portal not found. Add <b>?school=ghs</b> to the URL, or check your link.
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label className="block text-[11px] font-semibold text-text-mid uppercase tracking-wide mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 border-[1.5px] border-[rgba(92,61,46,0.15)] rounded-[11px] bg-cream text-sm outline-none transition-all focus:border-terracotta focus:bg-white focus:shadow-[0_0_0_4px_rgba(196,98,45,0.08)]"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-[11px] font-semibold text-text-mid uppercase tracking-wide mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 border-[1.5px] border-[rgba(92,61,46,0.15)] rounded-[11px] bg-cream text-sm outline-none transition-all focus:border-terracotta focus:bg-white focus:shadow-[0_0_0_4px_rgba(196,98,45,0.08)]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer text-base text-text-light"
                    >
                      👁
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center mb-5 -mt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer text-[13px] text-text-mid">
                    <input type="checkbox" defaultChecked className="accent-terracotta" />
                    Remember me
                  </label>
                  <a href="#" className="text-[13px] text-terracotta font-medium no-underline">
                    Forgot password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full p-3.5 bg-espresso text-white border-none rounded-[11px] text-[15px] font-semibold cursor-pointer transition-all hover:bg-brown-mid hover:-translate-y-0.5 disabled:opacity-70"
                >
                  {loading ? 'Signing in...' : 'Sign In to Dashboard →'}
                </button>
              </form>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-[rgba(92,61,46,0.15)]" />
                <div className="text-[11px] text-text-light">Quick demo access</div>
                <div className="flex-1 h-px bg-[rgba(92,61,46,0.15)]" />
              </div>

              <div className="bg-sand rounded-xl p-3.5">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-text-mid mb-2.5">
                  Demo Credentials (password: password)
                </div>
                {subdomain === 'admin' ? (
                  <div
                    className="flex justify-between items-center py-1.5 cursor-pointer"
                    onClick={() => fillDemo('admin@edu4everyone.com')}
                  >
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[rgba(196,98,45,0.12)] text-terracotta uppercase">
                      Super Admin
                    </span>
                    <span className="text-xs text-text-mid">admin@edu4everyone.com</span>
                  </div>
                ) : (
                  <>
                    <div
                      className="flex justify-between items-center py-1.5 border-b border-[rgba(92,61,46,0.15)] cursor-pointer"
                      onClick={() => fillDemo('principal@ghs.com')}
                    >
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[rgba(44,24,16,0.1)] text-brown-mid uppercase">
                        Principal
                      </span>
                      <span className="text-xs text-text-mid">principal@ghs.com</span>
                    </div>
                    <div
                      className="flex justify-between items-center py-1.5 cursor-pointer"
                      onClick={() => fillDemo('ahmed@ghs.com')}
                    >
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[rgba(139,99,85,0.12)] text-brown-light uppercase">
                        Teacher
                      </span>
                      <span className="text-xs text-text-mid">ahmed@ghs.com</span>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-cream" />}>
      <LoginForm />
    </Suspense>
  )
}
