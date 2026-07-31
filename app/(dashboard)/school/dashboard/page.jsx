import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Topbar from '@/components/layout/Topbar'

// Temporary placeholder — full dashboard with stats comes in next build phase.
// This exists so login has somewhere to land without a 404.
export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  return (
    <>
      <Topbar title="Dashboard" />
      <div className="p-[26px] flex-1">
        <div className="animate-fade-up">
          <h1 className="font-serif text-2xl text-text-dark">
            Welcome, {session?.user?.name}! 👋
          </h1>
          <p className="text-xs text-text-light mt-1">
            {session?.user?.schoolName} — logged in as {session?.user?.role}
          </p>
        </div>

        <div className="mt-6 bg-warm-white border-[1.5px] border-[rgba(92,61,46,0.12)] rounded-lg p-8 text-center animate-fade-up-2">
          <div className="text-4xl mb-3">🎉</div>
          <div className="font-serif text-lg text-text-dark mb-2">
            Migration foundation is working!
          </div>
          <div className="text-[13px] text-text-light">
            Login, auth, database and layout are connected. The full dashboard
            with stats, recent submissions and attendance overview is the next build step.
          </div>
        </div>
      </div>
    </>
  )
}
