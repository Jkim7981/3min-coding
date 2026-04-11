import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-xl bg-gray-200', className)}
    />
  )
}

// 대시보드 과목 카드 스켈레톤
export function SubjectCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-14 h-6 rounded-lg" />
        <Skeleton className="w-24 h-5" />
      </div>
      <Skeleton className="w-32 h-3 mb-2" />
      <Skeleton className="w-full h-2 rounded-full" />
    </div>
  )
}

// 통계 카드 스켈레톤
export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <Skeleton className="w-16 h-3 mb-2" />
      <Skeleton className="w-20 h-8" />
    </div>
  )
}

// 문제 카드 스켈레톤
export function QuestionCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Skeleton className="w-12 h-5 rounded-full" />
        <Skeleton className="w-10 h-5 rounded-full" />
      </div>
      <Skeleton className="w-full h-4" />
      <Skeleton className="w-3/4 h-4" />
      <Skeleton className="w-full h-24 rounded-xl" />
    </div>
  )
}

// 리스트 아이템 스켈레톤
export function ListItemSkeleton() {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
      <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="w-24 h-4" />
        <Skeleton className="w-36 h-3" />
      </div>
      <Skeleton className="w-4 h-4 rounded" />
    </div>
  )
}
