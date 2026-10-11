import clsx from 'clsx'
import { LogoMark } from '@/components/ui/Logo'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import { Input, PasswordInput } from '@/components/ui/FormControl'
import { initials } from '@/lib/utils/format'

// Presentational sign-in screen (no auth logic). LoginForm owns signIn(); the /design preview feeds
// it fake state. Left: the school's identity. Right: the form.
//   error: null | 'invalid' | 'locked'
function SchoolMark({ name, logoUrl, size }) {
  return logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUrl} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-xl border border-line bg-surface object-contain" />
  ) : (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
      className="flex shrink-0 items-center justify-center rounded-xl bg-espresso font-serif text-cream"
    >
      {initials(name)}
    </span>
  )
}

// Very quiet texture made of the logo's three thin vertical lines (3.5% opacity, decorative only).
function LinePattern() {
  return (
    <svg aria-hidden="true" focusable="false" className="pointer-events-none absolute inset-0 h-full w-full" style={{ opacity: 0.03 }}>
      <defs>
        <pattern id="nz-lines" width="96" height="96" patternUnits="userSpaceOnUse">
          <rect x="0" y="0" width="4" height="96" fill="#2C1810" />
          <rect x="8" y="0" width="4" height="96" fill="#2C1810" />
          <rect x="16" y="0" width="4" height="96" fill="#2C1810" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#nz-lines)" />
    </svg>
  )
}

export default function LoginView({
  schoolName,
  logoUrl,
  addressLabel,
  schoolFound = true,
  notFoundHint,
  email,
  password,
  onEmail,
  onPassword,
  onSubmit,
  loading = false,
  error = null,
  demo = [],
  onFillDemo,
  embedded = false,
}) {
  return (
    <div className={clsx('grid bg-bg text-ink lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]', embedded ? 'min-h-[640px]' : 'min-h-screen')}>
      {/* the school */}
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-sidebar p-12 lg:flex">
        <LinePattern />
        <div className="relative flex items-center gap-3">
          <SchoolMark name={schoolName} logoUrl={logoUrl} size={44} />
          <p className="text-caption font-semibold uppercase tracking-wider text-ink-3">School portal</p>
        </div>
        <div className="relative">
          <p className="ur text-lead text-ink-2" lang="ur">خوش آمدید</p>
          <h1 className="mt-2 font-serif text-[40px] leading-[1.15] text-ink">{schoolName}</h1>
          {addressLabel && <p className="mt-3 text-body text-ink-3">{addressLabel}</p>}
        </div>
        <p className="relative flex items-center gap-2 text-label text-ink-3">
          <LogoMark size={20} />
          Powered by Nizamo
        </p>
      </aside>

      {/* the form */}
      <main className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-[380px]">
          {/* identity on small screens */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <SchoolMark name={schoolName} logoUrl={logoUrl} size={40} />
            <div className="min-w-0">
              <p className="truncate text-body font-semibold text-ink">{schoolName}</p>
              <p className="text-caption text-ink-3">School portal</p>
            </div>
          </div>

          <h2 className="font-serif text-title text-ink">Sign in</h2>
          <p className="ur mt-1 text-body text-ink-3" lang="ur">اپنے اکاؤنٹ میں سائن ان کریں</p>

          {!schoolFound ? (
            <Alert tone="danger" title="We could not find that school" className="mt-6">
              {notFoundHint || 'Please open the sign-in link your school gave you, or ask your school for it.'}
            </Alert>
          ) : (
            <>
              {error === 'invalid' && (
                <Alert tone="danger" title="Incorrect email or password" className="mt-6">
                  Check them and try again. After 5 wrong tries the account is paused for 15 minutes.
                </Alert>
              )}
              {error === 'locked' && (
                <Alert tone="warning" title="Too many attempts" className="mt-6">
                  For your security this account is paused for 15 minutes. Try again then, or ask your school admin for help.
                </Alert>
              )}

              <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate={false}>
                <Input label="Email" type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => onEmail(e.target.value)} placeholder="name@school.edu.pk" />
                <PasswordInput label="Password" required autoComplete="current-password" value={password} onChange={(e) => onPassword(e.target.value)} />
                <Button type="submit" size="lg" loading={loading} className="w-full">
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
              </form>

              <p className="mt-5 text-label text-ink-3">Forgot your password? Contact your school admin.</p>

              {demo.length > 0 && (
                <div className="mt-8 rounded-card border border-dashed border-line-strong p-3">
                  <p className="mb-2 text-caption font-semibold uppercase tracking-wider text-ink-3">Demo accounts (development only)</p>
                  <ul>
                    {demo.map((a) => (
                      <li key={a.email}>
                        <button type="button" onClick={() => onFillDemo?.(a)} className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left hover:bg-sunken">
                          <span className="text-label font-medium text-ink">{a.label}</span>
                          <span className="truncate text-label text-ink-3">{a.email}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <p className="mt-10 flex items-center gap-2 text-caption text-ink-3 lg:hidden">
            <LogoMark size={20} />
            Powered by Nizamo
          </p>
        </div>
      </main>
    </div>
  )
}
