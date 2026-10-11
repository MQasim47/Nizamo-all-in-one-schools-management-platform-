import Link from 'next/link'

export const metadata = {
  title: "This school isn't on Nizamo yet",
  robots: { index: false, follow: false },
}

// Served (with a 404 status, via middleware) for any unknown school address.
export default function SchoolNotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-cream p-6">
      <div className="max-w-[460px] w-full bg-warm-white border border-[rgba(92,61,46,0.12)] rounded-xl p-10 text-center shadow-card">
        <div className="font-serif text-[15px] tracking-wide text-terracotta mb-4">Nizamo</div>
        <h1 className="font-serif text-[28px] leading-tight text-text-dark mb-3">
          This school isn&apos;t on Nizamo yet
        </h1>
        <p className="text-[14px] text-text-mid mb-7">
          We couldn&apos;t find a school at this address. Please check the link you were given, or ask
          your school for the correct one.
        </p>
        <Link
          href={process.env.NEXT_PUBLIC_ROOT_DOMAIN ? `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}` : '/'}
          className="inline-block bg-espresso text-white rounded-[11px] px-5 py-3 text-sm font-semibold no-underline"
        >
          Go to the Nizamo website
        </Link>
      </div>
    </main>
  )
}
