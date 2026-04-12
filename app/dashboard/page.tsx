'use client'

import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { SubjectCardSkeleton, StatCardSkeleton } from '@/components/ui/Skeleton'

interface Subject {
  id: string
  name: string
  teacher_id: string
  created_at: string
}

interface Stats {
  total_answered: number
  correct_rate: number
  streak: number
  this_week: number
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const userName = session?.user?.name ?? '학생'

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  // 두 API를 병렬로 fetching — 단일 loading 상태로 관리해 불필요한 리렌더링 방지
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000) // 10초 타임아웃

    Promise.all([
      fetch('/api/subjects', { signal: controller.signal })
        .then((r) => { if (!r.ok) throw new Error('failed'); return r.json() })
        .then((data) => { if (Array.isArray(data)) setSubjects(data) })
        .catch(() => {}),
      fetch('/api/stats', { signal: controller.signal })
        .then((r) => { if (!r.ok) throw new Error('failed'); return r.json() })
        .then((data) => setStats(data))
        .catch(() => {}),
    ]).finally(() => {
      clearTimeout(timeout)
      setLoading(false)
    })

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [])

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* 헤더 */}
      <div className="pt-4 flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">안녕하세요!</p>
          <h1 className="text-2xl font-bold text-primary-dark mt-0.5">{userName}님 👋</h1>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors mt-1 p-1.5 rounded-xl hover:bg-gray-100"
          aria-label="로그아웃"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M6 2H3a1 1 0 00-1 1v10a1 1 0 001 1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M10 11l3-3-3-3M13 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          로그아웃
        </button>
      </div>

      {/* 수강 과목 카드 */}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-gray-500">내 과목</h2>
        {loading ? (
          <>
            <SubjectCardSkeleton />
            <SubjectCardSkeleton />
          </>
        ) : subjects.length > 0 ? (
          subjects.slice(0, 2).map((subject) => (
            <Link
              key={subject.id}
              href={`/subjects/${subject.id}`}
              className="bg-white rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3 mb-1">
                <span className="bg-primary text-white text-xs font-bold px-2.5 py-1 rounded-lg">
                  과목
                </span>
                <span className="font-bold text-gray-800">{subject.name}</span>
              </div>
            </Link>
          ))
        ) : (
          <div className="bg-white rounded-2xl p-5 shadow-sm text-center">
            <p className="text-sm text-gray-400">수강 중인 과목이 없습니다</p>
          </div>
        )}

        <Link
          href="/dashboard/subjects"
          className="text-center text-sm text-primary font-medium py-2 min-h-[44px] flex items-center justify-center"
        >
          전체 과목 보기 →
        </Link>
      </section>

      {/* 학습 현황 */}
      <section className="grid grid-cols-2 gap-3">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-1">이번 주 풀이</p>
              <p className="text-2xl font-bold text-primary-dark">
                {stats?.this_week ?? 0}
                <span className="text-sm font-normal text-gray-400 ml-1">문제</span>
              </p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <p className="text-xs text-gray-400 mb-1">연속 학습</p>
              <p className="text-2xl font-bold text-primary-dark">
                {stats?.streak ?? 0}
                <span className="text-sm font-normal text-gray-400 ml-1">일</span>
              </p>
            </div>
          </>
        )}
      </section>

      {/* 오늘의 문제 바로가기 */}
      <section className="bg-primary rounded-2xl p-5 text-white">
        <p className="text-sm font-medium opacity-80 mb-1">오늘의 문제</p>
        <p className="font-bold text-lg mb-3">3분 복습 시작할까요?</p>
        <Link
          href="/dashboard/subjects"
          className="inline-flex items-center bg-white text-primary text-sm font-bold px-4 py-2.5 rounded-xl min-h-[44px]"
        >
          문제 풀기 →
        </Link>
      </section>
    </div>
  )
}
