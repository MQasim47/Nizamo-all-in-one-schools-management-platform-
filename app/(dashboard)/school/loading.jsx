import { Skeleton } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'

// Shown instantly while a school page loads its data.
export default function Loading() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading">
      <div>
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="mt-3 h-4 w-56" />
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <Card padding={false} className="lg:col-span-3">
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between border-t border-line px-5 py-5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-6 w-16" />
            </div>
          ))}
        </Card>
        <Card className="space-y-4 lg:col-span-2">
          <Skeleton className="h-5 w-36" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </Card>
      </div>
    </div>
  )
}
